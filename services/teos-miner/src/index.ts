import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import miningRoutes from "./mining.controller";

// Load environment variables from .env
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use("/mining", miningRoutes);

// Health check endpoint
app.get("/", (_, res) => {
  res.json({ status: "TEOS Mining API up and running 🚀" });
});

// Start server
const PORT = process.env.PORT || 4300;
app.listen(PORT, () => {
  console.log(`✅ TEOS Mining API running on port ${PORT}`);
});
