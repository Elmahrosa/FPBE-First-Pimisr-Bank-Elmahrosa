import { useCallback, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../utils/constants";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";

export function useTeosMining() {
  const wallet = useWallet();
  const [mining, setMining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{lastMined: number, nextMine: number} | null>(null);

  const fetchStats = useCallback(async () => {
    if (!wallet.publicKey) return;
    try {
      const { data } = await axios.get(`${BACKEND_URL}/mining/stats/${wallet.publicKey.toBase58()}`);
      setStats(data);
    } catch (e: any) {
      setError(e.message || "Failed to load stats");
    }
  }, [wallet.publicKey]);

  const mine = useCallback(async (tokenAccount: PublicKey) => {
    setMining(true);
    setError(null);
    try {
      if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");
      // 1. Request mining transaction from backend
      const { data } = await axios.post(`${BACKEND_URL}/mining/build-tx`, {
        wallet: wallet.publicKey.toBase58(),
        tokenAccount: tokenAccount.toBase58()
      });
      const tx = Transaction.from(Buffer.from(data.tx, "base64"));
      // 2. Sign and send transaction
      const signedTx = await wallet.signTransaction(tx);
      const connection = wallet.adapter.connection;
      const sig = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(sig, "confirmed");
      setMining(false);
      await fetchStats();
      return sig;
    } catch (e: any) {
      setMining(false);
      setError(e.message || "Mining failed");
      throw e;
    }
  }, [wallet, fetchStats]);

  return { mining, error, stats, fetchStats, mine };
}
