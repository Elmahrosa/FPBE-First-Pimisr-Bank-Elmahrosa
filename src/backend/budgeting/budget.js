// src/backend/budgeting/budget.js

const mongoose = require('mongoose');
const { sendAlert } = require('./alerts'); // Import the alert management module

// Define the Budget schema
const budgetSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  category: { type: String, required: true },
  limit: { type: Number, required: true },
  spent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

// Create the Budget model
const Budget = mongoose.model('Budget', budgetSchema);

/**
 * Create a new budget for a user.
 * @param {string} userId - The ID of the user.
 * @param {string} category - The budget category (e.g., "Food", "Transport").
 * @param {number} limit - The budget limit.
 * @returns {Promise<Object>} - The created budget.
 */
const createBudget = async (userId, category, limit) => {
  const budget = new Budget({ userId, category, limit });
  await budget.save();
  return budget;
};

/**
 * Update an existing budget for a user.
 * @param {string} userId - The ID of the user.
 * @param {string} category - The budget category.
 * @param {Object} updates - The updates to apply (e.g., limit).
 * @returns {Promise<Object>} - The updated budget.
 */
const updateBudget = async (userId, category, updates) => {
  const budget = await Budget.findOneAndUpdate(
    { userId, category },
    updates,
    { new: true }
  );
  return budget;
};

/**
 * Delete a budget for a user.
 * @param {string} userId - The ID of the user.
 * @param {string} category - The budget category.
 * @returns {Promise<Object>} - The deleted budget.
 */
const deleteBudget = async (userId, category) => {
  const budget = await Budget.findOneAndDelete({ userId, category });
  return budget;
};

/**
 * Track spending for a user.
 * @param {string} userId - The ID of the user.
 * @param {string} category - The budget category.
 * @param {number} amount - The amount spent.
 * @returns {Promise<Object>} - The updated budget.
 */
const trackSpending = async (userId, category, amount) => {
  const budget = await Budget.findOne({ userId, category });
  if (budget) {
    budget.spent += amount;
    await budget.save();

    // Check if the user is approaching their budget limit
    if (budget.spent >= budget.limit) {
      sendAlert(userId, category, budget.spent, budget.limit);
    }
    return budget;
  }
  throw new Error('Budget not found');
};

/**
 * Get the budget status for a user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Array>} - The budget status.
 */
const getBudgetStatus = async (userId) => {
  return await Budget.find({ userId });
};

module.exports = {
  createBudget,
  updateBudget,
  deleteBudget,
  trackSpending,
  getBudgetStatus,
};
