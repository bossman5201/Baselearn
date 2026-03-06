// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract LearnBaseCertificate is ERC1155, AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    string public name = "Learn Base Certificate";
    string public symbol = "LBCERT";

    string private baseMetadataURI;

    // certificateTypeId => active flag
    mapping(uint256 => bool) public activeCertificateType;

    // learner => certificateTypeId => claimed
    mapping(address => mapping(uint256 => bool)) public hasCertificate;

    error ZeroAddress();
    error InvalidCertificateType();
    error CertificateAlreadyIssued();
    error NonTransferable();

    event BaseURIUpdated(string newURI);
    event CertificateTypeUpdated(uint256 indexed certificateTypeId, bool active);
    event CertificateIssued(address indexed learner, uint256 indexed certificateTypeId);
    event CertificateRevoked(address indexed learner, uint256 indexed certificateTypeId, string reason);

    constructor(
        string memory initialBaseMetadataURI,
        address admin,
        address issuer,
        address pauser
    ) ERC1155("") {
        if (admin == address(0) || issuer == address(0) || pauser == address(0)) {
            revert ZeroAddress();
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

    function issueCertificate(address learner, uint256 certificateTypeId)
        external
        onlyRole(ISSUER_ROLE)
        whenNotPaused
        nonReentrant
    {
        _issueCertificate(learner, certificateTypeId);
    }

    function issueCertificateBatch(address[] calldata learners, uint256 certificateTypeId)
        external
        onlyRole(ISSUER_ROLE)
        whenNotPaused
        nonReentrant
    {
        uint256 total = learners.length;
        for (uint256 i = 0; i < total; ++i) {
            _issueCertificate(learners[i], certificateTypeId);
        }
    }

    function adminRevoke(address learner, uint256 certificateTypeId, string calldata reason)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        nonReentrant
    {
        if (learner == address(0)) {
            revert ZeroAddress();
        }

        if (balanceOf(learner, certificateTypeId) == 0) {
            revert InvalidCertificateType();
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

    function setApprovalForAll(address, bool) public pure override {
        revert NonTransferable();
    }

    function safeTransferFrom(address, address, uint256, uint256, bytes memory) public pure override {
        revert NonTransferable();
    }

    function safeBatchTransferFrom(address, address, uint256[] memory, uint256[] memory, bytes memory)
        public
        pure
        override
    {
        revert NonTransferable();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
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

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override
        whenNotPaused
    {
        super._update(from, to, ids, values);
    }
}
