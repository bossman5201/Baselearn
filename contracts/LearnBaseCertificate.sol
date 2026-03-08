// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract LearnBaseCertificate is ERC1155, AccessControl, Pausable, ReentrancyGuard, EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant CLAIM_TYPEHASH =
        keccak256("CertificateClaim(address learner,uint256 certificateTypeId,uint256 priceWei,uint256 nonce,uint256 deadline)");

    string public name = "Learn Base Certificate";
    string public symbol = "LBCERT";

    string private baseMetadataURI;
    mapping(address => uint256) public nonces;

    // certificateTypeId => active flag
    mapping(uint256 => bool) public activeCertificateType;
    mapping(uint256 => uint256) public certificatePriceWei;

    // learner => certificateTypeId => claimed
    mapping(address => mapping(uint256 => bool)) public hasCertificate;

    error ZeroAddress();
    error EmptyMetadataURI();
    error InvalidCertificateType();
    error SignatureExpired();
    error InvalidSignature();
    error InvalidNonce();
    error CertificateAlreadyIssued();
    error CertificateNotOwned();
    error PriceNotSet();
    error InvalidSignedPrice();
    error IncorrectPayment(uint256 expected, uint256 received);
    error NoWithdrawableBalance();
    error InvalidWithdrawAmount();
    error WithdrawFailed();
    error NonTransferable();

    event BaseURIUpdated(string newURI);
    event CertificateTypeUpdated(uint256 indexed certificateTypeId, bool active);
    event CertificatePriceUpdated(uint256 indexed certificateTypeId, uint256 priceWei);
    event CertificateIssued(address indexed learner, uint256 indexed certificateTypeId);
    event CertificateRevoked(address indexed learner, uint256 indexed certificateTypeId, string reason);
    event RevenueWithdrawn(address indexed to, uint256 amountWei);

    constructor(
        string memory initialBaseMetadataURI,
        address admin,
        address issuer,
        address pauser
    ) ERC1155("") EIP712("LearnBaseCertificate", "1") {
        if (admin == address(0) || issuer == address(0) || pauser == address(0)) {
            revert ZeroAddress();
        }

        if (bytes(initialBaseMetadataURI).length == 0) {
            revert EmptyMetadataURI();
        }

        baseMetadataURI = initialBaseMetadataURI;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, issuer);
        _grantRole(PAUSER_ROLE, pauser);
    }

    function uri(uint256 certificateTypeId) public view override returns (string memory) {
        return string.concat(baseMetadataURI, Strings.toString(certificateTypeId), ".json");
    }

    function setBaseMetadataURI(string calldata newBaseMetadataURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (bytes(newBaseMetadataURI).length == 0) {
            revert EmptyMetadataURI();
        }

        baseMetadataURI = newBaseMetadataURI;
        emit BaseURIUpdated(newBaseMetadataURI);
    }

    function setCertificateType(uint256 certificateTypeId, bool isActive) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (certificateTypeId == 0) {
            revert InvalidCertificateType();
        }

        activeCertificateType[certificateTypeId] = isActive;
        emit CertificateTypeUpdated(certificateTypeId, isActive);
    }

    function setCertificatePrice(uint256 certificateTypeId, uint256 priceWei) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (certificateTypeId == 0) {
            revert InvalidCertificateType();
        }

        if (priceWei == 0) {
            revert PriceNotSet();
        }

        certificatePriceWei[certificateTypeId] = priceWei;
        emit CertificatePriceUpdated(certificateTypeId, priceWei);
    }

    function claimCertificate(
        uint256 certificateTypeId,
        uint256 priceWei,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    )
        external
        payable
        whenNotPaused
        nonReentrant
    {
        if (block.timestamp > deadline) {
            revert SignatureExpired();
        }

        if (priceWei == 0) {
            revert InvalidSignedPrice();
        }

        if (msg.value != priceWei) {
            revert IncorrectPayment(priceWei, msg.value);
        }

        if (nonce != nonces[msg.sender]) {
            revert InvalidNonce();
        }

        bytes32 digest = getClaimDigest(msg.sender, certificateTypeId, priceWei, nonce, deadline);
        address signer = digest.recover(signature);
        if (!hasRole(ISSUER_ROLE, signer)) {
            revert InvalidSignature();
        }

        nonces[msg.sender] = nonce + 1;
        _issueCertificate(msg.sender, certificateTypeId);
    }

    function getClaimDigest(address learner, uint256 certificateTypeId, uint256 priceWei, uint256 nonce, uint256 deadline)
        public
        view
        returns (bytes32)
    {
        return
            _hashTypedDataV4(
                keccak256(abi.encode(CLAIM_TYPEHASH, learner, certificateTypeId, priceWei, nonce, deadline))
            );
    }

    function adminRevoke(address learner, uint256 certificateTypeId, string calldata reason)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (learner == address(0)) {
            revert ZeroAddress();
        }

        if (balanceOf(learner, certificateTypeId) == 0) {
            revert CertificateNotOwned();
        }

        _burn(learner, certificateTypeId, 1);
        hasCertificate[learner][certificateTypeId] = false;

        emit CertificateRevoked(learner, certificateTypeId, reason);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function withdraw(address payable to, uint256 amountWei) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        _withdraw(to, amountWei);
    }

    function withdrawAll(address payable to) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        _withdraw(to, address(this).balance);
    }

    function _withdraw(address payable to, uint256 amountWei) internal {
        if (to == address(0)) {
            revert ZeroAddress();
        }

        uint256 available = address(this).balance;
        if (available == 0) {
            revert NoWithdrawableBalance();
        }

        if (amountWei == 0 || amountWei > available) {
            revert InvalidWithdrawAmount();
        }

        (bool sent,) = to.call{value: amountWei}("");
        if (!sent) {
            revert WithdrawFailed();
        }

        emit RevenueWithdrawn(to, amountWei);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override {
        if (from != address(0) && to != address(0)) {
            revert NonTransferable();
        }

        super._update(from, to, ids, values);
    }

    function _issueCertificate(address learner, uint256 certificateTypeId) internal {
        if (learner == address(0)) {
            revert ZeroAddress();
        }

        if (certificateTypeId == 0 || !activeCertificateType[certificateTypeId]) {
            revert InvalidCertificateType();
        }

        if (hasCertificate[learner][certificateTypeId]) {
            revert CertificateAlreadyIssued();
        }

        hasCertificate[learner][certificateTypeId] = true;
        _mint(learner, certificateTypeId, 1, "");

        emit CertificateIssued(learner, certificateTypeId);
    }
}
