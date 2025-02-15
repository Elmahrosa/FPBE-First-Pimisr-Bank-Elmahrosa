// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract VirtualIBAN {
    struct Account {
        string iban;
        string currency;
        uint256 balance;
    }

    mapping(address => Account) public accounts;

    event IBANCreated(address indexed user, string iban, string currency);
    event Deposit(address indexed user, uint256 amount, string currency);
    event Withdraw(address indexed user, uint256 amount, string currency);

    function createIBAN(string memory iban, string memory currency) public {
        require(bytes(accounts[msg.sender].iban).length == 0, "IBAN already exists!");
        accounts[msg.sender] = Account(iban, currency, 0);
        emit IBANCreated(msg.sender, iban, currency);
    }

    function deposit(uint256 amount) public {
        require(bytes(accounts[msg.sender].iban).length > 0, "No IBAN found!");
        accounts[msg.sender].balance += amount;
        emit Deposit(msg.sender, amount, accounts[msg.sender].currency);
    }

    function withdraw(uint256 amount) public {
        require(accounts[msg.sender].balance >= amount, "Insufficient balance!");
        accounts[msg.sender].balance -= amount;
        emit Withdraw(msg.sender, amount, accounts[msg.sender].currency);
    }

    function getBalance() public view returns (uint256) {
        return accounts[msg.sender].balance;
    }
}
