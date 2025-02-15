// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AtomicSwap {
    struct Swap {
        address sender;
        address receiver;
        uint256 amount;
        bytes32 hashLock;
        uint256 expiration;
        bool completed;
    }

    mapping(bytes32 => Swap) public swaps;

    event SwapInitiated(bytes32 indexed swapId, address sender, address receiver, uint256 amount, bytes32 hashLock);
    event SwapCompleted(bytes32 indexed swapId);
    event SwapExpired(bytes32 indexed swapId);

    function initiateSwap(address _receiver, uint256 _amount, bytes32 _hashLock, uint256 _expiration) external payable {
        require(msg.value == _amount, "Incorrect amount sent");
        require(_expiration > block.timestamp, "Invalid expiration time");

        bytes32 swapId = keccak256(abi.encodePacked(msg.sender, _receiver, _amount, _hashLock, _expiration));

        swaps[swapId] = Swap({
            sender: msg.sender,
            receiver: _receiver,
            amount: _amount,
            hashLock: _hashLock,
            expiration: _expiration,
            completed: false
        });

        emit SwapInitiated(swapId, msg.sender, _receiver, _amount, _hashLock);
    }

    function completeSwap(bytes32 swapId, string memory secret) external {
        Swap storage swap = swaps[swapId];

        require(swap.receiver == msg.sender, "Not the recipient");
        require(!swap.completed, "Swap already completed");
        require(keccak256(abi.encodePacked(secret)) == swap.hashLock, "Invalid secret");

        swap.completed = true;
        payable(swap.receiver).transfer(swap.amount);

        emit SwapCompleted(swapId);
    }

    function expireSwap(bytes32 swapId) external {
        Swap storage swap = swaps[swapId];

        require(block.timestamp > swap.expiration, "Swap not expired");
        require(!swap.completed, "Swap already completed");

        swap.completed = true;
        payable(swap.sender).transfer(swap.amount);

        emit SwapExpired(swapId);
    }
}
