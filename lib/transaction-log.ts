export interface Transaction {
  id: string
  timestamp: number
  type: "swap" | "card_payment" | "land_purchase" | "pi_payment"
  from: string
  to: string
  amount: number
  fromToken: string
  toToken?: string
  status: "pending" | "completed" | "failed"
  txHash?: string
  user: string
}

export class TransactionLog {
  private static STORAGE_KEY = "fpbe_transaction_log"

  static addTransaction(transaction: Omit<Transaction, "id" | "timestamp">): Transaction {
    const newTransaction: Transaction = {
      ...transaction,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }

    const logs = this.getTransactions()
    logs.unshift(newTransaction)
    
    // Keep only last 100 transactions in localStorage
    const trimmedLogs = logs.slice(0, 100)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedLogs))

    return newTransaction
  }

  static getTransactions(user?: string): Transaction[] {
    try {
      const logs = localStorage.getItem(this.STORAGE_KEY)
      if (!logs) return []
      
      const parsed = JSON.parse(logs)
      return user ? parsed.filter((tx: Transaction) => tx.user === user) : parsed
    } catch (error) {
      console.error("[v0] Error reading transaction log:", error)
      return []
    }
  }

  static updateTransactionStatus(id: string, status: Transaction["status"], txHash?: string) {
    const logs = this.getTransactions()
    const index = logs.findIndex(tx => tx.id === id)
    
    if (index !== -1) {
      logs[index].status = status
      if (txHash) logs[index].txHash = txHash
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(logs))
    }
  }

  static clearLogs() {
    localStorage.removeItem(this.STORAGE_KEY)
  }
}
