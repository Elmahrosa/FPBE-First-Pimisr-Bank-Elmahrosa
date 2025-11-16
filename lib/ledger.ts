type SwapLog = {
  timestamp: string
  wallet: string
  from: string
  to: string
  amount: number
  toAmount: number
  fee: number
}

type PaymentLog = {
  timestamp: string
  wallet: string
  method: string
  amountUSD: number
  token?: string
}

type LandJoinLog = {
  timestamp: string
  wallet: string
  m2: number
  method: string
  amount: number
}

class Ledger {
  private swaps: SwapLog[] = []
  private payments: PaymentLog[] = []
  private landJoins: LandJoinLog[] = []

  logSwap(data: Omit<SwapLog, 'timestamp'>) {
    this.swaps.push({
      ...data,
      timestamp: new Date().toISOString()
    })
    this.persistToLocalStorage()
  }

  logPayment(data: Omit<PaymentLog, 'timestamp'>) {
    this.payments.push({
      ...data,
      timestamp: new Date().toISOString()
    })
    this.persistToLocalStorage()
  }

  logLandJoin(data: Omit<LandJoinLog, 'timestamp'>) {
    this.landJoins.push({
      ...data,
      timestamp: new Date().toISOString()
    })
    this.persistToLocalStorage()
  }

  exportLedger() {
    return {
      swaps: this.swaps,
      payments: this.payments,
      landJoins: this.landJoins,
      exportedAt: new Date().toISOString()
    }
  }

  private persistToLocalStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fpbe_ledger', JSON.stringify({
        swaps: this.swaps,
        payments: this.payments,
        landJoins: this.landJoins
      }))
    }
  }

  loadFromLocalStorage() {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('fpbe_ledger')
      if (data) {
        const parsed = JSON.parse(data)
        this.swaps = parsed.swaps || []
        this.payments = parsed.payments || []
        this.landJoins = parsed.landJoins || []
      }
    }
  }

  getStats() {
    return {
      totalSwaps: this.swaps.length,
      totalPayments: this.payments.length,
      totalLandJoins: this.landJoins.length,
      totalFeesCollected: this.swaps.reduce((sum, swap) => sum + swap.fee, 0),
      totalLandM2: this.landJoins.reduce((sum, join) => sum + join.m2, 0)
    }
  }
}

export const ledger = new Ledger()

if (typeof window !== 'undefined') {
  ledger.loadFromLocalStorage()
}
