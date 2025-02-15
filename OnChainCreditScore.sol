// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract OnChainCreditScore {
    using SafeMath for uint256;

    struct User {
        uint256 totalTransactions;
        uint256 totalLent;
        uint256 totalBorrowed;
        uint256 creditScore;
    }

    mapping(address => User) public users;

    event CreditScoreUpdated(address indexed user, uint256 newScore);

    function updateTransactionHistory(address _user, uint256 _amount, bool _isLending) public {
        if (_isLending) {
            users[_user].totalLent = users[_user].totalLent.add(_amount);
        } else {
            users[_user].totalBorrowed = users[_user].totalBorrowed.add(_amount);
        }
        users[_user].totalTransactions += 1;
        _updateCreditScore(_user);
    }

    function _updateCreditScore(address _user) internal {
        uint256 score = (users[_user].totalLent.mul(2)).sub(users[_user].totalBorrowed);
        users[_user].creditScore = score > 1000 ? 1000 : score;
        emit CreditScoreUpdated(_user, users[_user].creditScore);
    }

    function getCreditScore(address _user) public view returns (uint256) {
        return users[_user].creditScore;
    }
}
