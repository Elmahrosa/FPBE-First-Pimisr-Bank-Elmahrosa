// src/backend/app.js

const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan'); // For logging requests
const { metricsMiddleware, metricsEndpoint, updateHealth } = require('./monitoring/metrics');
const healthChecks = require('./loadBalancing/healthChecks');
const cache = require('./common/cache');

// Initialize the Express application
const app = express();

// Middleware
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(morgan('combined')); // Log HTTP requests
app.use(metricsMiddleware); // Collect metrics for requests

// Health check endpoint
app.use(healthChecks);

// Metrics endpoint for Prometheus
app.get('/metrics', metricsEndpoint);

// Example route for user data
app.get('/api/users', cache.cacheMiddleware(60), async (req, res) => {
  // Simulate fetching user data (e.g., from a database)
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];
  res.status(200).json(users);
});

// Example route for transactions
app.post('/api/transactions', async (req, res) => {
  const { senderId, receiverId, amount } = req.body;

  // Simulate transaction processing logic
  if (!senderId || !receiverId || amount <= 0) {
    return res.status(400).json({ error: 'Invalid transaction data' });
  }

  // Here you would typically process the transaction (e.g., update balances)
  res.status(201).json({ message: 'Transaction successful', senderId, receiverId, amount });
});

// Example route for investments
app.get('/api/investments', cache.cacheMiddleware(120), async (req, res) => {
  // Simulate fetching investment data
  const investments = [
    { id: 1, product: 'Stock A', amount: 1000 },
    { id: 2, product: 'Bond B', amount: 500 },
  ];
  res.status(200).json(investments);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  updateHealth(true); // Set service health to UP on startup
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  updateHealth(false); // Set service health to DOWN on shutdown
  process.exit();
});
