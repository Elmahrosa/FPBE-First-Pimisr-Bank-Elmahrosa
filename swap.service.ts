import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { abi, contractAddress } from '../config/contract';

@Injectable()
export class SwapService {
  private provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  private wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
  private contract = new ethers.Contract(contractAddress, abi, this.wallet);

  async initiateSwap(sender: string, receiver: string, amount: string, hashLock: string) {
    const tx = await this.contract.initiateSwap(receiver, ethers.utils.parseEther(amount), hashLock, Date.now() + 3600);
    await tx.wait();
    return { success: true, message: 'Swap initiated', txHash: tx.hash };
  }

  async completeSwap(swapId: string, secret: string) {
    const tx = await this.contract.completeSwap(swapId, secret);
    await tx.wait();
    return { success: true, message: 'Swap completed', txHash: tx.hash };
  }
}
