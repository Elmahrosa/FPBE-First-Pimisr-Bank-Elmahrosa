"use client";
import React, { useEffect, useState } from "react";
import { WalletConnect } from "../components/WalletConnect";
import { StatsPanel } from "../components/StatsPanel";
import { MineButton } from "../components/MineButton";
import { useWallet } from "@solana/wallet-adapter-react";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";

const TEOS_MINT = process.env.NEXT_PUBLIC_TEOS_MINT!; // Set this in your .env.local

export default function Home() {
  const wallet = useWallet();
  const [tokenAccount, setTokenAccount] = useState<string | null>(null);

  useEffect(() => {
    const fetchATA = async () => {
      if (wallet.publicKey) {
        try {
          const ata = await getAssociatedTokenAddress(
            new PublicKey(TEOS_MINT),
            wallet.publicKey
          );
          setTokenAccount(ata.toBase58());
        } catch (err) {
          setTokenAccount(null);
        }
      } else {
        setTokenAccount(null);
      }
    };
    fetchATA();
  }, [wallet.publicKey]);

  return (
    <main style={{ maxWidth: 600, margin: "0 auto", padding: 32 }}>
      <h1 style={{ fontSize: 38, marginBottom: 24, letterSpacing: -1 }}>
        TEOS Mining dApp
      </h1>
      <WalletConnect />
      {wallet.connected && (
        <>
          <StatsPanel />
          {tokenAccount && <MineButton tokenAccount={tokenAccount} />}
        </>
      )}
      <footer style={{ marginTop: 40, color: "#888" }}>
        <hr />
        <p>
          Powered by Solana + TEOS &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
