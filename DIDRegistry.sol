// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract DIDRegistry is Ownable {
    struct DID {
        address owner;
        string metadata;
        bool revoked;
    }

    mapping(string => DID) private dids;

    event DIDCreated(string indexed did, address owner, string metadata);
    event DIDUpdated(string indexed did, string metadata);
    event DIDRevoked(string indexed did);

    function registerDID(string memory did, string memory metadata) public {
        require(dids[did].owner == address(0), "DID already registered");
        dids[did] = DID(msg.sender, metadata, false);
        emit DIDCreated(did, msg.sender, metadata);
    }

    function updateDID(string memory did, string memory metadata) public {
        require(dids[did].owner == msg.sender, "Unauthorized");
        dids[did].metadata = metadata;
        emit DIDUpdated(did, metadata);
    }

    function revokeDID(string memory did) public {
        require(dids[did].owner == msg.sender, "Unauthorized");
        dids[did].revoked = true;
        emit DIDRevoked(did);
    }

    function resolveDID(string memory did) public view returns (address, string memory, bool) {
        require(dids[did].owner != address(0), "DID not found");
        return (dids[did].owner, dids[did].metadata, dids[did].revoked);
    }
}
