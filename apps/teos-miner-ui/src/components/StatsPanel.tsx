"use client";
import React, { FC, useEffect, useState } from "react";
import { useTeosMining } from "../hooks/useTeosMining";
import { useWallet } from "@solana/wallet-adapter-react";

export const StatsPanel: FC = () => {
  const { stats, fetchStats } = useTeosMining();
  const wallet = useWallet();
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [cooldown, setCooldown] = useState<number>(0);

  // Auto-refresh time
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update cooldown timer
  useEffect(() => {
    if (!stats) {
      setCooldown(0);
      return;
    }
    setCooldown(Math.max(stats.nextMine - now, 0));
  }, [stats, now]);

  // Refetch stats on wallet change
  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.publicKey]);

  if (!wallet.connected) return null;

  return (
    <div style={{
      background: "#181d29",
      color: "#fff",
      padding: 24,
      borderRadius: 12,
      marginBottom: 24,
      boxShadow: "0 2px 10px rgba(0,0,0,.2)"
    }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: 22 }}>TEOS Mining Stats</h3>
      {stats ? (
        <>
          <div>
            <b>Last mined:</b>{" "}
            {stats.lastMined
              ? new Date(stats.lastMined * 1000).toLocaleString()
              : "Never"}
          </div>
          <div>
            <b>Next mine:</b>{" "}
            {cooldown > 0
              ? `${cooldown}s (at ${new Date(stats.nextMine * 1000).toLocaleTimeString()})`
              : "Ready to mine!"}
          </div>
        </>
      ) : (
        <div>Loading mining stats...</div>
      )}
    </div>
  );
};
