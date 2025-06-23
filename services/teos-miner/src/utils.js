import { Connection, PublicKey, Keypair, clusterApiUrl } from "@solana/web3.js";
import dotenv from "dotenv";
dotenv.config();

export const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");
export const TEOS_PROGRAM_ID = new PublicKey(process.env.TEOS_PROGRAM_ID!);
export const TEOS_MINT = new PublicKey(process.env.TEOS_MINT!);

export const connection = new Connection(SOLANA_RPC_URL, "confirmed");

export function getAdminKeypair(): Keypair {
  if (!process.env.ADMIN_PRIVATE_KEY) {
    throw new Error("ADMIN_PRIVATE_KEY not set");
  }
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.ADMIN_PRIVATE_KEY)));
}
