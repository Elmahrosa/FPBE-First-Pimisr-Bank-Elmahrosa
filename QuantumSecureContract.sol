// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract QuantumSecureContract {
    mapping(address => bytes) private publicKeys;
    mapping(address => bytes) private digitalSignatures;

    event PublicKeyRegistered(address indexed user, bytes publicKey);
    event MessageSigned(address indexed user, bytes signature);

    function registerPublicKey(bytes memory publicKey) public {
        publicKeys[msg.sender] = publicKey;
        emit PublicKeyRegistered(msg.sender, publicKey);
    }

    function signMessage(bytes memory signature) public {
        digitalSignatures[msg.sender] = signature;
        emit MessageSigned(msg.sender, signature);
    }

    function getPublicKey(address user) public view returns (bytes memory) {
        return publicKeys[user];
    }

    function getSignature(address user) public view returns (bytes memory) {
        return digitalSignatures[user];
    }
}
