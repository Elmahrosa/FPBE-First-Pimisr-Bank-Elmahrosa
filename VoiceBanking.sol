// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VoiceBanking {
    mapping(address => uint256) public balances;
    address owner;

    event FundsTransferred(address indexed from, address indexed to, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function transferFunds(address payable to, uint256 amount) public {
        require(balances[msg.sender] >= amount, "Saldo tidak mencukupi");
        balances[msg.sender] -= amount;
        to.transfer(amount);
        emit FundsTransferred(msg.sender, to, amount);
    }

    function checkBalance() public view returns (uint256) {
        return balances[msg.sender];
    }
}
