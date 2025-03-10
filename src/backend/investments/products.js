// src/backend/investments/products.js

const mongoose = require('mongoose');

// Define the Product schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['stock', 'bond', 'crypto'] },
  description: { type: String },
  price: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Create the Product model
const Product = mongoose.model('Product', productSchema);

/**
 * Create a new financial product.
 * @param {Object} productData - The data for the new product.
 * @returns {Promise<Object>} - The created product.
 */
const createProduct = async (productData) => {
  const product = new Product(productData);
  await product.save();
  return product;
};

/**
 * Get all available financial products.
 * @returns {Promise<Array>} - An array of products.
 */
const getAllProducts = async () => {
  return await Product.find();
};

/**
 * Get a product by its ID.
 * @param {string} productId - The ID of the product.
 * @returns {Promise<Object>} - The product details.
 */
const getProductById = async (productId) => {
  return await Product.findById(productId);
};

/**
 * Update a product by its ID.
 * @param {string} productId - The ID of the product.
 * @param {Object} updates - The updates to apply to the product.
 * @returns {Promise<Object>} - The updated product.
 */
const updateProduct = async (productId, updates) => {
  return await Product.findByIdAndUpdate(productId, updates, { new: true });
};

/**
 * Delete a product by its ID.
 * @param {string} productId - The ID of the product.
 * @returns {Promise<Object>} - The deleted product.
 */
const deleteProduct = async (productId) => {
  return await Product.findByIdAndDelete(productId);
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
