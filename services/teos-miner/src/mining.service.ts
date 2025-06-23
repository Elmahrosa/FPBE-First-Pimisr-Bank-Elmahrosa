import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider, BN, web3 } from "@coral-xyz/anchor";
import { connection, TEOS_PROGRAM_ID } from "./utils";
import idl from "./teos_idl.json"; // Anchor IDL (export from your Anchor build)

export interface MiningResult {
  signature: string;
  minedAmount: number;
  nextMineTimestamp: number;
}

export async function getMinerStatePubkey(wallet: PublicKey): Promise<[PublicKey, number]> {
  // PDA: ["miner", user pubkey]
  return await PublicKey.findProgramAddress(
    [Buffer.from("miner"), wallet.toBuffer()],
    TEOS_PROGRAM_ID
  );
}

/**
 * Returns current mining stats for the user.
 */
export async function getMiningStats(walletAddress: string) {
  const provider = new AnchorProvider(connection, {} as any, {});
  const program = new Program(idl as any, TEOS_PROGRAM_ID, provider);
  const user = new PublicKey(walletAddress);
  const [minerStatePda] = await getMinerStatePubkey(user);

  try {
    const minerState = await program.account.minerState.fetch(minerStatePda);
    return {
      lastMined: minerState.lastMined as number,
      nextMine: (minerState.lastMined as number) + 3600 // 1 hour cooldown
    };
  } catch (e) {
    // Not initialized yet
    return {
      lastMined: 0,
      nextMine: 0
    };
  }
}

/**
 * Returns the transaction instruction for mining, to be signed by the user.
 */
export async function buildMineTransaction(walletAddress: string, tokenAccount: string) {
  const provider = new AnchorProvider(connection, {} as any, {});
  const program = new Program(idl as any, TEOS_PROGRAM_ID, provider);
  const user = new PublicKey(walletAddress);
  const tokenAcc = new PublicKey(tokenAccount);
  const [minerStatePda] = await getMinerStatePubkey(user);

  const tx = await program.methods.mine().accounts({
    mint: program.account.mint,
    tokenAccount: tokenAcc,
    minerState: minerStatePda,
    authority: user,
    tokenProgram: web3.TOKEN_PROGRAM_ID
  }).transaction();

  return tx;
}
