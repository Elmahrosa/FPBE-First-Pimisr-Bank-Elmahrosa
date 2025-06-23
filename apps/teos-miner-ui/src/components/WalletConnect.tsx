"use client";
import dynamic from "next/dynamic";
import { FC } from "react";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

// Wallet connection UI dynamically loaded (for SSR/Next.js compatibility)
const WalletConnectionProvider = dynamic(
  () => import("../utils/WalletConnectionProvider").then((mod) => mod.WalletConnectionProvider),
  { ssr: false }
);

export const WalletConnect: FC = () => (
  <WalletConnectionProvider>
    <WalletModalProvider>
      <div style={{ marginBottom: 24 }}>
        <WalletMultiButton />
      </div>
    </WalletModalProvider>
  </WalletConnectionProvider>
);
