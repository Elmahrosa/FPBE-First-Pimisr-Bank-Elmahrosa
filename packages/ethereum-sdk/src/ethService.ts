import { ethers } from "ethers";

export class EthService {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  async getBalance(address: string): Promise<string> {
    const balance = await this.provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  }

  async sendTransaction(to: string, amountEth: string) {
    const tx = {
      to,
      value: ethers.utils.parseEther(amountEth),
    };
    const receipt = await this.wallet.sendTransaction(tx);
    return receipt;
  }
}
