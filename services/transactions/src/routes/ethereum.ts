import express from "express";
import { EthService } from "../../../packages/ethereum-sdk/src/ethService";

const router = express.Router();
const rpcUrl = process.env.ETH_RPC_URL!;
const privateKey = process.env.ETH_PRIVATE_KEY!;
const eth = new EthService(rpcUrl, privateKey);

// Send ETH
router.post("/send", async (req, res) => {
  try {
    const { to, amountEth } = req.body;
    if (!to || !amountEth) return res.status(400).json({ error: "Missing to or amountEth" });
    const tx = await eth.sendTransaction(to, amountEth);
    res.json({ hash: tx.hash });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Get Balance
router.get("/balance/:address", async (req, res) => {
  try {
    const balance = await eth.getBalance(req.params.address);
    res.json({ balance });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
