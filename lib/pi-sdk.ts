// Pi Network SDK integration
export interface PiUser {
  uid: string
  username: string
  wallet?: string
  stakedPi?: number
}

export interface PiPayment {
  identifier: string
  amount: number
  memo: string
  metadata: Record<string, any>
}

// Declare Pi SDK on window
declare global {
  interface Window {
    Pi?: {
      init: (config: { version: string; sandbox?: boolean }) => void
      authenticate: (scopes: string[], onIncompletePaymentFound: (payment: any) => void) => Promise<PiUser>
      createPayment: (
        paymentData: PiPayment,
        callbacks: {
          onReadyForServerApproval: (paymentId: string) => void
          onReadyForServerCompletion: (paymentId: string, txid: string) => void
          onCancel: (paymentId: string) => void
          onError: (error: Error, payment?: any) => void
        },
      ) => void
    }
  }
}

import { CONFIG } from "./config"

export const PiSDK = {
  authenticate: async (): Promise<PiUser> => {
    if (typeof window !== "undefined" && window.Pi) {
      try {
        const scopes = ["username", "payments", "wallet_address"]
        const user = await window.Pi.authenticate(scopes, (payment) => {
          console.log("Incomplete payment found:", payment)
        })
        
        localStorage.setItem("pi_user", JSON.stringify(user))
        localStorage.setItem("pi_wallet", user.wallet || "")
        localStorage.setItem("pi_username", user.username)
        
        return user
      } catch (error) {
        console.error("Pi authentication error:", error)
        throw error
      }
    }
    throw new Error("Pi SDK not available - please open this app in Pi Browser")
  },

  createPayment: async (payment: PiPayment): Promise<string> => {
    if (typeof window !== "undefined" && window.Pi) {
      return new Promise((resolve, reject) => {
        window.Pi!.createPayment(payment, {
          onReadyForServerApproval: (paymentId) => {
            console.log("Payment ready for approval:", paymentId)
            resolve(paymentId)
          },
          onReadyForServerCompletion: (paymentId, txid) => {
            console.log("Payment completed:", paymentId, txid)
          },
          onCancel: (paymentId) => {
            console.log("Payment cancelled:", paymentId)
            reject(new Error("Payment cancelled"))
          },
          onError: (error) => {
            console.error("Payment error:", error)
            reject(error)
          },
        })
      })
    }
    throw new Error("Pi SDK not available")
  },

  init: () => {
    if (typeof window !== "undefined" && window.Pi) {
      window.Pi.init({ 
        version: "2.0", 
        sandbox: CONFIG.piNetwork.sandboxMode 
      })
      console.log("Pi SDK initialized for PiNet subdomain:", CONFIG.piNetwork.pinetSubdomain)
      console.log("Domain:", CONFIG.piNetwork.domain)
    }
  },
}

// Admin credentials
export const ADMIN_USERNAME = "AAMS1969"
export const ADMIN_WALLET = "GDIW2DXDR3DU4CYTRHDS3WYDGHMUQZG7E5FJWWW6XSADOC5VHMYRYD6F"
export const INVITATION_CODE = "AAMS1969"
export const ACCESS_FEE = 1 // 1 Pi to access the app

export interface PiWalletData {
  balance: number
  staking: {
    amount: number
    apy: number
    startDate: string
  }
  mining: {
    active: boolean
    rate: number
    lastMined: string
  }
  securityCircle: {
    members: number
    lastUpdated: string
  }
  transactions: Array<{
    type: "received" | "sent" | "mining"
    from?: string
    to?: string
    amount: number
    timestamp: string
    status: "completed" | "pending"
  }>
}

export async function getPiWalletData(username: string): Promise<PiWalletData> {
  try {
    // Try to get from localStorage first (cached data)
    const cachedData = localStorage.getItem(`fpbe_pi_wallet_${username}`)
    if (cachedData) {
      return JSON.parse(cachedData)
    }
    
    // If no cached data, return structure with zeros (real = 0 until fetched)
    return {
      balance: 0,
      staking: {
        amount: 0,
        apy: 8.5,
        startDate: new Date().toISOString()
      },
      mining: {
        active: false,
        rate: 0,
        lastMined: new Date().toISOString()
      },
      securityCircle: {
        members: 0,
        lastUpdated: new Date().toISOString()
      },
      transactions: []
    }
  } catch (error) {
    console.error("Error fetching Pi wallet data:", error)
    throw error
  }
}

export function savePiWalletData(username: string, data: PiWalletData): void {
  localStorage.setItem(`fpbe_pi_wallet_${username}`, JSON.stringify(data))
}

export const piSdk = {
  async getBalance(walletAddress: string): Promise<number> {
    // Real Pi balance must come from Pi Network API
    // For now, check localStorage or return 0 (real value)
    const storedBalance = localStorage.getItem(`pi_balance_${walletAddress}`)
    return storedBalance ? parseFloat(storedBalance) : 0
  },

  async getLockedAmount(walletAddress: string): Promise<number> {
    // Real locked Pi from Pi Network staking
    const storedLocked = localStorage.getItem(`pi_locked_${walletAddress}`)
    return storedLocked ? parseFloat(storedLocked) : 0
  },

  async connect(): Promise<string | null> {
    // Connect via Pi SDK
    try {
      const user = await PiSDK.authenticate()
      if (user.wallet) {
        localStorage.setItem("wallet", user.wallet)
        localStorage.setItem("username", user.username)
        return user.wallet
      }
    } catch (error) {
      console.error("Pi connection error:", error)
    }
    return null
  }
}

// Badge Verification Module
export class BadgeVerifier {
  constructor(private user: PiUser) {}

  async verifyBlueCheck(): Promise<boolean> {
    return this.user.username === ADMIN_USERNAME || this.user.wallet === ADMIN_WALLET
  }

  async getBadgeStatus(): Promise<BadgeStatus> {
    const isVerified = await this.verifyBlueCheck()
    const contributionScore = this.getContributionScore()
    const badgeLevel = this.calculateBadgeLevel(contributionScore)

    return {
      hasBlueCheck: isVerified,
      verifiedContributor: isVerified,
      badgeLevel,
      contributionScore,
    }
  }

  private getContributionScore(): number {
    return 0
  }

  private calculateBadgeLevel(score: number): BadgeStatus["badgeLevel"] {
    if (score >= 10000) return "diamond"
    if (score >= 5000) return "gold"
    if (score >= 1000) return "silver"
    if (score >= 100) return "bronze"
    return "none"
  }
}

export interface BadgeStatus {
  hasBlueCheck: boolean
  verifiedContributor: boolean
  badgeLevel: "none" | "bronze" | "silver" | "gold" | "diamond"
  contributionScore: number
}

// Oracle Feed Module for live pricing
export class OracleFeed {
  constructor(private feedType: "pi_usd" | "ert_usd" | "elmahrosa_usd") {}

  async getPrice(): Promise<number> {
    try {
      if (this.feedType === "pi_usd") {
        const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=usd")
        const data = await response.json()
        return data["pi-network"]?.usd || 0.2
      }
      if (this.feedType === "ert_usd") return 0.04
      if (this.feedType === "elmahrosa_usd") return 0.1
      return 0
    } catch (error) {
      console.error("Oracle feed error:", error)
      return 0.2
    }
  }
}

// Wallet Connection Module
export class WalletConnect {
  private user: PiUser | null = null

  async connect(): Promise<PiUser> {
    this.user = await PiSDK.authenticate()
    return this.user
  }

  async getBalance(token: "PI" | "ERT" | "ELMAHROSA" | "TEOS"): Promise<number> {
    const storedBalances = localStorage.getItem("fpbe_balances")
    if (storedBalances) {
      const balances = JSON.parse(storedBalances)
      return balances[token.toLowerCase()] || 0
    }
    return 0
  }

  async getPiBalance(username: string): Promise<number> {
    try {
      const storedBalances = localStorage.getItem(`fpbe_balances_${username}`)
      if (storedBalances) {
        const balances = JSON.parse(storedBalances)
        return balances.pi || 0
      }
      return 0
    } catch (error) {
      console.error("Error fetching Pi balance for user:", error)
      return 0
    }
  }

  async getLockedAmount(username: string): Promise<number> {
    try {
      const userData = localStorage.getItem(`fpbe_user_${username}`)
      if (userData) {
        const user = JSON.parse(userData)
        return user.stakedPi || 0
      }
      return 0
    } catch (error) {
      console.error("Error fetching locked Pi:", error)
      return 0
    }
  }

  getUser(): PiUser | null {
    return this.user
  }
}
