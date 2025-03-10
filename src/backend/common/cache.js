// src/backend/common/cache.js

const redis = require('redis');
const { promisify } = require('util');

// Create a Redis client
const client = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

// Promisify Redis methods for easier async/await usage
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.setex).bind(client);
const delAsync = promisify(client.del).bind(client);

// Handle Redis connection errors
client.on('error', (err) => {
  console.error('Redis error:', err);
});

/**
 * Set a value in the cache with an expiration time.
 * @param {string} key - The cache key.
 * @param {any} value - The value to cache.
 * @param {number} expiration - Expiration time in seconds.
 * @returns {Promise<void>}
 */
const setCache = async (key, value, expiration) => {
  try {
    await setAsync(key, expiration, JSON.stringify(value));
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

/**
 * Get a value from the cache.
 * @param {string} key - The cache key.
 * @returns {Promise<any>} - The cached value or null.
 */
const getCache = async (key) => {
  try {
    const data = await getAsync(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
};

/**
 * Delete a specific cache key.
 * @param {string} key - The cache key to delete.
 * @returns {Promise<void>}
 */
const deleteCache = async (key) => {
  try {
    await delAsync(key);
  } catch (error) {
    console.error('Error deleting cache:', error);
  }
};

/**
 * Middleware to cache responses for specific routes.
 * @param {number} expiration - Expiration time in seconds.
 */
const cacheMiddleware = (expiration) => {
  return async (req, res, next) => {
    const key = req.originalUrl; // Use the request URL as the cache key
    const cachedResponse = await getCache(key);

    if (cachedResponse) {
      return res.status(200).json(cachedResponse); // Return cached response
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      await setCache(key, body, expiration); // Cache the response
      return originalJson(body);
    };

    next();
  };
};

module.exports = {
  setCache,
  getCache,
  deleteCache,
  cacheMiddleware,
};
