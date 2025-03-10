// src/backend/investments/investment.js

const mongoose = require('mongoose');

// Define the Investment schema
const investmentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  productId: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

// Create the Investment model
const Investment = mongoose.model('Investment', investmentSchema);

/**
 * Invest in a financial product.
 * @param {string} userId - The ID of the user.
 * @param {string} productId - The ID of the financial product.
 * @param {number} amount - The amount to invest.
 * @returns {Promise<Object>} - The created investment record.
 */
const invest = async (userId, productId, amount) => {
  const investment = new Investment({ userId, productId, amount });
  await investment.save();
  return investment;
};

/**
 * Get the investment portfolio for a user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Array>} - The investment portfolio.
 */
const getPortfolio = async (userId) => {
  return await Investment.find({ userId }).populate('productId'); // Assuming productId references a Product model
};

/**
 * Get the total investment amount for a user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<number>} - The total investment amount.
 */
const getTotalInvestment = async (userId) => {
  const investments = await Investment.find({ userId });
  return investments.reduce((total, investment) => total + investment.amount, 0);
};

module.exports = {
  invest,
  getPortfolio,
  getTotalInvestment,
};
