// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeFiLending {
    IERC20 public stablecoin;
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public borrowings;

    event Deposited(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount);
    event Repaid(address indexed user, uint256 amount);

    constructor(address _stablecoin) {
        stablecoin = IERC20(_stablecoin);
    }

    function deposit(uint256 _amount) external {
        stablecoin.transferFrom(msg.sender, address(this), _amount);
        deposits[msg.sender] += _amount;
        emit Deposited(msg.sender, _amount);
    }

    function borrow(uint256 _amount) external {
        require(deposits[msg.sender] * 2 >= _amount, "Insufficient collateral");
        stablecoin.transfer(msg.sender, _amount);
        borrowings[msg.sender] += _amount;
        emit Borrowed(msg.sender, _amount);
    }

    function repay(uint256 _amount) external {
        stablecoin.transferFrom(msg.sender, address(this), _amount);
        borrowings[msg.sender] -= _amount;
        emit Repaid(msg.sender, _amount);
    }
}
