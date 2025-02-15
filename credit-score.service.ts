import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { abi, contractAddress } from '../config/contract';

@Injectable()
export class CreditScoreService {
  private provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  private wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
  private contract = new ethers.Contract(contractAddress, abi, this.wallet);

  async getCreditScore(user: string) {
    return await this.contract.getCreditScore(user);
  }

  async updateTransaction(user: string, amount: number, isLending: boolean) {
    const tx = await this.contract.updateTransactionHistory(user, amount, isLending);
    await tx.wait();
    return { success: true, message: 'Transaction updated', txHash: tx.hash };
  }
}
