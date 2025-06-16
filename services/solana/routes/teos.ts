import express from 'express';
import { getTeosBalance, sendTeos } from '../teos';
import { Keypair } from '@solana/web3.js';

const router = express.Router();

/**
 * Get TEOS balance for a wallet
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const balance = await getTeosBalance(req.params.address);
    res.json({ address: req.params.address, balance });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * Transfer TEOS tokens
 * POST body: { to: string, amount: number }
 * WARNING: This expects the sender's secret key in env (for demonstration only, use KMS in prod)
 */
router.post('/transfer', async (req, res) => {
  try {
    const { to, amount } = req.body;
    if (!process.env.SENDER_SECRET_KEY) throw new Error('Sender secret key not set');
    const fromKeypair = Keypair.fromSecretKey(secret);
    const sig = await sendTeos(fromKeypair, to, Number(amount));
    res.json({ txSignature: sig });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
