// src/backend/p2pPayments/p2p.js

const mongoose = require('mongoose');

// Define the Transaction schema
const transactionSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
});

// Create the Transaction model
const Transaction = mongoose.model('Transaction', transactionSchema);

/**
 * Send money to another user.
 * @param {string} senderId - The ID of the sender.
 * @param {string} receiverId - The ID of the receiver.
 * @param {number} amount - The amount to send.
 * @returns {Promise<Object>} - The created transaction record.
 */
const sendMoney = async (senderId, receiverId, amount) => {
  // Validate the transaction (e.g., check if sender has sufficient balance)
  // This is a placeholder for actual balance checking logic
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  // Create a new transaction record
  const transaction = new Transaction({ senderId, receiverId, amount });
  await transaction.save();
  return transaction;
};

/**
 * Get transaction history for a user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Array>} - The transaction history.
 */
const getTransactionHistory = async (userId) => {
  return await Transaction.find({
    $or: [{ senderId: userId }, { receiverId: userId }],
  }).sort({ date: -1 }); // Sort by date, most recent first
};

/**
 * Get the balance of a user (placeholder function).
 * @param {string} userId - The ID of the user.
 * @returns {Promise<number>} - The user's balance.
 */
const getUser Balance = async (userId) => {
  // Placeholder for actual balance retrieval logic
  // In a real application, you would query the user's account balance from the database
  return 1000; // Example balance
};

module.exports = {
  sendMoney,
  getTransactionHistory,
  getUser Balance,
};
