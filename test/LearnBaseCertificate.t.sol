// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "../contracts/LearnBaseCertificate.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function deal(address account, uint256 newBalance) external;
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function prank(address msgSender) external;
    function warp(uint256 newTimestamp) external;
}

contract WithdrawSink {
    receive() external payable {}
}

contract LearnBaseCertificateTest {
    Vm private constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 private constant CERTIFICATE_PRICE = 0.0005 ether;

    function _selector(bytes memory revertData) internal pure returns (bytes4 selector) {
        if (revertData.length < 4) {
            return bytes4(0);
        }

        assembly {
            selector := mload(add(revertData, 32))
        }
    }

    function _assertTrue(bool condition, string memory message) internal pure {
        require(condition, message);
    }

    function _assertEqUint(uint256 actual, uint256 expected, string memory message) internal pure {
        require(actual == expected, message);
    }

    function _assertEqBytes4(bytes4 actual, bytes4 expected, string memory message) internal pure {
        require(actual == expected, message);
    }

    function _sign(uint256 privateKey, bytes32 digest) internal returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = VM.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _deployFresh()
        internal
        returns (
            LearnBaseCertificate cert,
            address admin,
            address pauser,
            address learnerOne,
            address learnerTwo,
            uint256 issuerPrivateKey
        )
    {
        uint256 adminPrivateKey = 0xA11;
        issuerPrivateKey = 0xB22;
        uint256 pauserPrivateKey = 0xC33;
        uint256 learnerOnePrivateKey = 0xD44;
        uint256 learnerTwoPrivateKey = 0xE55;

        admin = VM.addr(adminPrivateKey);
        address issuerSigner = VM.addr(issuerPrivateKey);
        pauser = VM.addr(pauserPrivateKey);
        learnerOne = VM.addr(learnerOnePrivateKey);
        learnerTwo = VM.addr(learnerTwoPrivateKey);

        VM.deal(learnerOne, 10 ether);
        VM.deal(learnerTwo, 10 ether);

        cert = new LearnBaseCertificate("https://baselearn.vercel.app/certificates/", admin, issuerSigner, pauser);
    }

    function _activateTypeWithPrice(LearnBaseCertificate cert, address admin, uint256 certificateTypeId) internal {
        VM.prank(admin);
        cert.setCertificateType(certificateTypeId, true);

        VM.prank(admin);
        cert.setCertificatePrice(certificateTypeId, CERTIFICATE_PRICE);
    }

    function _claimWithIssuerSig(
        LearnBaseCertificate cert,
        address learner,
        uint256 certificateTypeId,
        uint256 issuerPrivateKey,
        uint256 deadline,
        uint256 paymentWei
    ) internal returns (bool, bytes memory) {
        uint256 nonce = cert.nonces(learner);
        bytes32 digest = cert.getClaimDigest(learner, certificateTypeId, paymentWei, nonce, deadline);
        bytes memory signature = _sign(issuerPrivateKey, digest);

        VM.prank(learner);
        try cert.claimCertificate{value: paymentWei}(certificateTypeId, paymentWei, nonce, deadline, signature) {
            return (true, "");
        } catch (bytes memory revertData) {
            return (false, revertData);
        }
    }

    function testClaimCertificateSuccess() external {
        (LearnBaseCertificate cert, address admin,, address learner,, uint256 issuerPrivateKey) = _deployFresh();
        _activateTypeWithPrice(cert, admin, 1);

        uint256 deadline = block.timestamp + 1 days;
        (bool claimed,) = _claimWithIssuerSig(cert, learner, 1, issuerPrivateKey, deadline, CERTIFICATE_PRICE);
        _assertTrue(claimed, "valid paid claim should succeed");

        _assertEqUint(cert.balanceOf(learner, 1), 1, "learner should own one certificate");
        _assertEqUint(cert.nonces(learner), 1, "nonce should increment");
        _assertEqUint(address(cert).balance, CERTIFICATE_PRICE, "contract should retain payment");
    }

    function testClaimRevertsWithIncorrectPayment() external {
        (LearnBaseCertificate cert, address admin,, address learner,, uint256 issuerPrivateKey) = _deployFresh();
        _activateTypeWithPrice(cert, admin, 1);

        uint256 deadline = block.timestamp + 1 days;
        uint256 nonce = cert.nonces(learner);
        bytes32 digest = cert.getClaimDigest(learner, 1, CERTIFICATE_PRICE, nonce, deadline);
        bytes memory signature = _sign(issuerPrivateKey, digest);

        bool claimed = false;
        bytes memory revertData;
        VM.prank(learner);
        try cert.claimCertificate{value: CERTIFICATE_PRICE - 1}(1, CERTIFICATE_PRICE, nonce, deadline, signature) {
            claimed = true;
        } catch (bytes memory err) {
            revertData = err;
        }

        _assertTrue(!claimed, "claim should fail on wrong payment");
        _assertEqBytes4(
            _selector(revertData), LearnBaseCertificate.IncorrectPayment.selector, "wrong payment error selector"
        );
    }

    function testClaimRevertsWithInvalidSignature() external {
        (LearnBaseCertificate cert, address admin,, address learner,,) = _deployFresh();
        _activateTypeWithPrice(cert, admin, 1);

        uint256 wrongSignerPrivateKey = 0x999;
        uint256 nonce = cert.nonces(learner);
        uint256 deadline = block.timestamp + 1 days;
        bytes32 digest = cert.getClaimDigest(learner, 1, CERTIFICATE_PRICE, nonce, deadline);
        bytes memory badSignature = _sign(wrongSignerPrivateKey, digest);

        VM.prank(learner);
        try cert.claimCertificate{value: CERTIFICATE_PRICE}(1, CERTIFICATE_PRICE, nonce, deadline, badSignature) {
            revert("claim should fail with wrong signer");
        } catch (bytes memory revertData) {
            _assertEqBytes4(
                _selector(revertData), LearnBaseCertificate.InvalidSignature.selector, "wrong invalid-sig error"
            );
        }
    }

    function testClaimRevertsOnExpiredSignature() external {
        (LearnBaseCertificate cert, address admin,, address learner,, uint256 issuerPrivateKey) = _deployFresh();
        _activateTypeWithPrice(cert, admin, 1);

        uint256 deadline = block.timestamp + 1;
        VM.warp(deadline + 1);

        uint256 nonce = cert.nonces(learner);
        bytes32 digest = cert.getClaimDigest(learner, 1, CERTIFICATE_PRICE, nonce, deadline);
        bytes memory signature = _sign(issuerPrivateKey, digest);

        VM.prank(learner);
        try cert.claimCertificate{value: CERTIFICATE_PRICE}(1, CERTIFICATE_PRICE, nonce, deadline, signature) {
            revert("claim should fail after deadline");
        } catch (bytes memory revertData) {
            _assertEqBytes4(_selector(revertData), LearnBaseCertificate.SignatureExpired.selector, "wrong expired error");
        }
    }

    function testClaimReplayRevertsWithInvalidNonce() external {
        (LearnBaseCertificate cert, address admin,, address learner,, uint256 issuerPrivateKey) = _deployFresh();
        _activateTypeWithPrice(cert, admin, 1);

        uint256 nonce = cert.nonces(learner);
        uint256 deadline = block.timestamp + 1 days;
        bytes32 digest = cert.getClaimDigest(learner, 1, CERTIFICATE_PRICE, nonce, deadline);
        bytes memory signature = _sign(issuerPrivateKey, digest);

        VM.prank(learner);
        cert.claimCertificate{value: CERTIFICATE_PRICE}(1, CERTIFICATE_PRICE, nonce, deadline, signature);

        VM.prank(learner);
        try cert.claimCertificate{value: CERTIFICATE_PRICE}(1, CERTIFICATE_PRICE, nonce, deadline, signature) {
            revert("replay should fail");
        } catch (bytes memory revertData) {
            _assertEqBytes4(_selector(revertData), LearnBaseCertificate.InvalidNonce.selector, "wrong nonce error");
        }
    }

    function testPauseBlocksClaimButAllowsRevokeAndReissue() external {
        (
            LearnBaseCertificate cert,
            address admin,
            address pauser,
            address learnerOne,
            address learnerTwo,
            uint256 issuerPrivateKey
        ) = _deployFresh();
        _activateTypeWithPrice(cert, admin, 1);

        (bool initialClaim,) =
            _claimWithIssuerSig(cert, learnerOne, 1, issuerPrivateKey, block.timestamp + 1 days, CERTIFICATE_PRICE);
        _assertTrue(initialClaim, "initial claim should succeed");

        VM.prank(pauser);
        cert.pause();

        (bool blockedClaim, bytes memory pauseError) =
            _claimWithIssuerSig(cert, learnerTwo, 1, issuerPrivateKey, block.timestamp + 1 days, CERTIFICATE_PRICE);
        _assertTrue(!blockedClaim, "claim should fail while paused");
        _assertEqBytes4(_selector(pauseError), Pausable.EnforcedPause.selector, "wrong pause error");

        VM.prank(admin);
        cert.adminRevoke(learnerOne, 1, "policy");
        _assertEqUint(cert.balanceOf(learnerOne, 1), 0, "revoke should burn certificate");
        _assertTrue(!cert.hasCertificate(learnerOne, 1), "revoked should be reissuable");

        VM.prank(pauser);
        cert.unpause();

        (bool reissued,) =
            _claimWithIssuerSig(cert, learnerOne, 1, issuerPrivateKey, block.timestamp + 1 days, CERTIFICATE_PRICE);
        _assertTrue(reissued, "reissue after revoke should succeed");
        _assertEqUint(cert.balanceOf(learnerOne, 1), 1, "reissue should mint again");
    }

    function testTransferAlwaysReverts() external {
        (LearnBaseCertificate cert, address admin,, address learner,, uint256 issuerPrivateKey) = _deployFresh();
        _activateTypeWithPrice(cert, admin, 1);

        (bool claimed,) =
            _claimWithIssuerSig(cert, learner, 1, issuerPrivateKey, block.timestamp + 1 days, CERTIFICATE_PRICE);
        _assertTrue(claimed, "claim should succeed");

        VM.prank(learner);
        try cert.safeTransferFrom(learner, address(0xABCD), 1, 1, "") {
            revert("transfer should revert");
        } catch (bytes memory revertData) {
            _assertEqBytes4(_selector(revertData), LearnBaseCertificate.NonTransferable.selector, "wrong transfer error");
        }
    }

    function testAdminCanWithdrawRevenue() external {
        (LearnBaseCertificate cert, address admin,, address learner,, uint256 issuerPrivateKey) = _deployFresh();
        _activateTypeWithPrice(cert, admin, 1);

        (bool claimed,) =
            _claimWithIssuerSig(cert, learner, 1, issuerPrivateKey, block.timestamp + 1 days, CERTIFICATE_PRICE);
        _assertTrue(claimed, "claim should succeed");

        WithdrawSink sink = new WithdrawSink();

        VM.prank(admin);
        cert.withdrawAll(payable(address(sink)));

        _assertEqUint(address(sink).balance, CERTIFICATE_PRICE, "sink should receive payment");
        _assertEqUint(address(cert).balance, 0, "contract balance should be zero");
    }
}
