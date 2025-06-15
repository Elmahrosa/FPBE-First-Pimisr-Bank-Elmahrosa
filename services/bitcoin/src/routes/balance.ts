import express from "express";
import axios from "axios";

const router = express.Router();

router.get("/balance/:address", async (req, res) => {
  const { address } = req.params;
  try {
    const response = await axios.get(
      `https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`
    );
    const btcBalance = response.data.final_balance / 1e8;
    res.json({ address, balance: btcBalance });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
