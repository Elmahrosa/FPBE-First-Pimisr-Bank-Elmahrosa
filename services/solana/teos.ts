import { Connection, PublicKey, Keypair, Transaction, sendAndConfirmTransaction, clusterApiUrl } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, createTransferInstruction, getMint } from '@solana/spl-token';
import dotenv from 'dotenv';
dotenv.config();

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
const TEOS_MINT = new PublicKey(process.env.TEOS_MINT!); // Your SPL Token Mint

export const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

/**
 * Get the TEOS token balance for a wallet address.
 */
export async function getTeosBalance(walletAddress: string): Promise<string> {
  const wallet = new PublicKey(walletAddress);
  const ata = await getAssociatedTokenAddress(TEOS_MINT, wallet);

  try {
    const account = await getAccount(connection, ata);
    const mintInfo = await getMint(connection, TEOS_MINT);
    return (Number(account.amount) / Math.pow(10, mintInfo.decimals)).toString();
  } catch (e) {
    // If no account found, balance is zero
    return '0';
  }
}

/**
 * Transfer TEOS tokens from one wallet to another.
 * @param fromKeypair The sender's Keypair
 * @param toWallet Recipient's public address (Solana)
 * @param amount Amount of TEOS (UI units, e.g. 1.5)
 * @returns transaction signature
 */
export async function sendTeos(fromKeypair: Keypair, toWallet: string, amount: number): Promise<string> {
  const toPublicKey = new PublicKey(toWallet);
  const mintInfo = await getMint(connection, TEOS_MINT);

  const fromATA = await getAssociatedTokenAddress(TEOS_MINT, fromKeypair.publicKey);
  const toATA = await getAssociatedTokenAddress(TEOS_MINT, toPublicKey);

  const instructions = [
    createTransferInstruction(
      fromATA,
      toATA,
      fromKeypair.publicKey,
      BigInt(amount * Math.pow(10, mintInfo.decimals))
    ),
  ];

  const tx = new Transaction().add(...instructions);
  const sig = await sendAndConfirmTransaction(connection, tx, [fromKeypair]);
  return sig;
}
