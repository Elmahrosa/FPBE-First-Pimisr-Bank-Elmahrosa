const express = require("express");
const { ethers } = require("ethers");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Konfigurasi Blockchain
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contractABI = require("./VirtualIBANABI.json");
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);

// Register IBAN ke Blockchain
app.post("/registerIBAN", async (req, res) => {
  const { iban, currency } = req.body;
  try {
    const tx = await contract.createIBAN(iban, currency);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Balance Blockchain
app.get("/getBalance/:user", async (req, res) => {
  try {
    const balance = await contract.getBalance({ from: req.params.user });
    res.json({ balance: ethers.utils.formatEther(balance) });
  } catch (error) {
    res.status(404).json({ error: "Balance not found" });
  }
});

app.listen(3001, () => console.log("✅ Blockchain IBAN API running on port 3001"));
