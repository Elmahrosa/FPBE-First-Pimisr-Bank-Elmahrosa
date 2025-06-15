import { ethers } from "ethers";

export class EthService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;

  constructor(rpcUrl: string, privateKey: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Get ETH balance of an address in Ether units.
   */
  async getBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      throw new Error(`Unable to fetch balance: ${(error as Error).message}`);
    }
  }

  /**
   * Send Ether from the current wallet to another address.
   * Returns the transaction receipt.
   */
  async sendTransaction(to: string, amountEth: string): Promise<ethers.TransactionResponse> {
    try {
      const tx = await this.wallet.sendTransaction({
        to,
        value: ethers.parseEther(amountEth),
      });
      await tx.wait();
      return tx;
    } catch (error) {
      throw new Error(`Transaction failed: ${(error as Error).message}`);
    }
  }

  /**
   * Read from a smart contract (call).
   * @param abi - Contract ABI
   * @param contractAddress - Address of contract
   * @param method - Method name
   * @param args - Arguments for the method
   */
  async readContract(
    abi: any,
    contractAddress: string,
    method: string,
    args: any[] = []
  ): Promise<any> {
    try {
      const contract = new ethers.Contract(contractAddress, abi, this.provider);
      return await contract[method](...args);
    } catch (error) {
      throw new Error(`Contract read failed: ${(error as Error).message}`);
    }
  }

  /**
   * Write to a smart contract (send transaction).
   * @param abi - Contract ABI
   * @param contractAddress - Address of contract
   * @param method - Method name
   * @param args - Arguments for the method
   */
  async writeContract(
    abi: any,
    contractAddress: string,
    method: string,
    args: any[] = []
  ): Promise<ethers.TransactionResponse> {
    try {
      const contract = new ethers.Contract(contractAddress, abi, this.wallet);
      const tx = await contract[method](...args);
      await tx.wait();
      return tx;
    } catch (error) {
      throw new Error(`Contract write failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get the current wallet address.
   */
  getAddress(): string {
    return this.wallet.address;
  }

  /**
   * Listen to events on a contract.
   * @param abi - Contract ABI
   * @param contractAddress - Address of contract
   * @param event - Event name
   * @param callback - Callback function for event
   */
  listenToEvent(
    abi: any,
    contractAddress: string,
    event: string,
    callback: (...args: any[]) => void
  ): ethers.Contract {
    const contract = new ethers.Contract(contractAddress, abi, this.provider);
    contract.on(event, (...args) => callback(...```

---

## Key Features

- **ETH balance fetching** (with error handling)
- **Send transactions**
- **Read/write smart contract** (generic ABI/method support)
- **Get own wallet address**
- **Listen to contract events**
- Uses latest ethers.js v6+ API style

---

## Usage Example (for your backend, not to include in your SDK)

```typescript
import { EthService } from './ethService';
import erc20abi from './abi/erc20.json';

const eth = new EthService(process.env.ETH_RPC_URL!, process.env.ETH_PRIVATE_KEY!);

(async () => {
  // Get balance
  const balance = await eth.getBalance('0x...');
  console.log(`ETH Balance: ${balance}`);

  // Send ETH
  const tx = await eth.sendTransaction('0x...', '0.01');
  console.log(`Sent: ${tx.hash}`);

  // Read contract
  const symbol = await eth.readContract(erc20abi, '0xERC20...', 'symbol');
  console.log(`Token symbol: ${symbol}`);

  // Listen to Transfer events
  eth.listenToEvent(erc20abi, '0xERC20...', 'Transfer', (from, to, value, event) => {
    console.log(`Transfer from ${from} to ${to} of ${value}`);
  });
})();
