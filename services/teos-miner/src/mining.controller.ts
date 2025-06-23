import { Router } from "express";
import { getMiningStats, buildMineTransaction } from "./mining.service";

const router = Router();

/**
 * GET /mining/stats/:wallet
 * Returns last mined and next eligible mining time.
 */
router.get("/stats/:wallet", async (req, res) => {
  try {
    const stats = await getMiningStats(req.params.wallet);
    res.json(stats);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * POST /mining/build-tx
 * Body: { wallet: string, tokenAccount: string }
 * Returns a serialized transaction for user to sign and send.
 */
router.post("/build-tx", async (req, res) => {
  const { wallet, tokenAccount } = req.body;
  if (!wallet || !tokenAccount) {
    return res.status(400).json({ error: "wallet and tokenAccount required" });
  }
  try {
    const tx = await buildMineTransaction(wallet, tokenAccount);
    const serialized = tx.serialize({ requireAllSignatures: false }).toString("base64");
    res.json({ tx: serialized });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
