"use client";
import React, { FC, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useTeosMining } from "../hooks/useTeosMining";

interface MineButtonProps {
  tokenAccount: string;
}

export const MineButton: FC<MineButtonProps> = ({ tokenAccount }) => {
  const wallet = useWallet();
  const { mining, error, stats, fetchStats, mine } = useTeosMining();
  const [cooldown, setCooldown] = useState<number>(0);

  // Fetch mining stats when wallet changes
  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.publicKey]);

  // Update cooldown timer
  useEffect(() => {
    if (!stats) return;
    const now = Math.floor(Date.now() / 1000);
    setCooldown(Math.max(stats.nextMine - now, 0));

    if (stats.nextMine > now) {
      const interval = setInterval(() => {
        const current = Math.max(stats.nextMine - Math.floor(Date.now() / 1000), 0);
        setCooldown(current);
        if (current === 0) clearInterval(interval);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [stats]);

  const handleMine = async () => {
    try {
      await mine(new PublicKey(tokenAccount));
      alert("🎉 Successfully mined TEOS!");
    } catch (e) {
      // error handled by hook
    }
  };

  return (
    <div>
      <button
        onClick={handleMine}
        disabled={mining || cooldown > 0 || !wallet.connected}
        style={{
          padding: "14px 40px",
          fontSize: 22,
          borderRadius: 8,
          background: mining || cooldown > 0 || !wallet.connected ? "#7e7e7e" : "#00b894",
          color: "#fff",
          border: "none",
          marginTop: 20,
          cursor: mining || cooldown > 0 || !wallet.connected ? "not-allowed" : "pointer",
          transition: "background 0.2s"
        }}
      >
        {mining
          ? "Mining..."
          : cooldown > 0
            ? `⏳ Cooldown: ${cooldown}s`
            : wallet.connected
              ? "🚀 Mine TEOS"
              : "Connect Wallet"}
      </button>
      {error && (
        <div style={{ color: "red", marginTop: 14, fontWeight: 500 }}>
          {error}
        </div>
      )}
    </div>
  );
};
