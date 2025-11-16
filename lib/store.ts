"use client"

export interface Transaction {
  id: string
  type: "send" | "receive" | "stake" | "unstake" | "land" | "card" | "convert"
  amount: number
  currency: "PI" | "TEOS" | "ERT" | "TUT" | "USD" | "USDT"
  description: string
  date: Date
  status: "completed" | "pending"
}

export interface VirtualCard {
  id: string
  number: string
  holder: string
  expiry: string
  cvv: string
  balance: number
  status: "active" | "locked"
  type: "standard" | "gold" | "platinum"
}

export interface LandClaim {
  id: string
  hectares: number
  piContributed: number
  location: string
  date: Date
  status: "pending" | "verified" | "claimed"
}

interface UserData {
  piBalance: number
  teosBalance: number
  ertBalance: number
  tutBalance: number
  usdBalance: number
  usdtBalance: number
  stakedPi: number
  transactions: Transaction[]
  cards: VirtualCard[]
  landClaims: LandClaim[]
  totalLandHectares: number
}

const STORAGE_KEY = "fpbe_user_data"

export class DataStore {
  static getUserData(username: string): UserData {
    if (typeof window === "undefined") {
      return this.getDefaultData()
    }

    const stored = localStorage.getItem(`${STORAGE_KEY}_${username}`)
    if (stored) {
      const data = JSON.parse(stored)
      // Convert date strings back to Date objects
      data.transactions = data.transactions.map((t: any) => ({
        ...t,
        date: new Date(t.date),
      }))
      data.landClaims = data.landClaims.map((l: any) => ({
        ...l,
        date: new Date(l.date),
      }))
      return data
    }

    return this.getDefaultData()
  }

  static saveUserData(username: string, data: UserData) {
    if (typeof window === "undefined") return
    localStorage.setItem(`${STORAGE_KEY}_${username}`, JSON.stringify(data))
  }

  static getDefaultData(): UserData {
    return {
      piBalance: 0,
      teosBalance: 0,
      ertBalance: 0,
      tutBalance: 0,
      usdBalance: 0,
      usdtBalance: 0,
      stakedPi: 0,
      transactions: [],
      cards: [],
      landClaims: [],
      totalLandHectares: 0,
    }
  }

  static addTransaction(username: string, transaction: Omit<Transaction, "id" | "date">) {
    const data = this.getUserData(username)
    const newTransaction: Transaction = {
      ...transaction,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: new Date(),
    }
    data.transactions.unshift(newTransaction)
    this.saveUserData(username, data)
    return newTransaction
  }

  static updateBalance(
    username: string,
    piAmount = 0,
    ertAmount = 0,
    tutAmount = 0,
    usdAmount = 0,
    usdtAmount = 0,
    teosAmount = 0
  ) {
    const data = this.getUserData(username)
    data.piBalance += piAmount
    data.ertBalance += ertAmount
    data.tutBalance += tutAmount
    data.usdBalance += usdAmount
    data.usdtBalance += usdtAmount
    data.teosBalance += teosAmount
    this.saveUserData(username, data)
  }

  static createVirtualCard(username: string, type: "standard" | "gold" | "platinum"): VirtualCard {
    const data = this.getUserData(username)
    const cardNumber = `4532 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`
    const newCard: VirtualCard = {
      id: `card_${Date.now()}`,
      number: cardNumber,
      holder: username.toUpperCase(),
      expiry: `${String(new Date().getMonth() + 1).padStart(2, "0")}/${new Date().getFullYear() + 4}`,
      cvv: String(Math.floor(100 + Math.random() * 900)),
      balance: 0,
      status: "active",
      type,
    }
    data.cards.push(newCard)
    this.saveUserData(username, data)
    return newCard
  }

  static claimLand(username: string, piAmount: number, piPerHectare: number = 1000): LandClaim {
    const data = this.getUserData(username)
    const hectares = piAmount / piPerHectare
    const newClaim: LandClaim = {
      id: `land_${Date.now()}`,
      hectares,
      piContributed: piAmount,
      location: "110 Acres, Alexandria, Egypt - ElMahrosa Smart City",
      date: new Date(),
      status: "pending",
    }
    data.landClaims.push(newClaim)
    data.totalLandHectares += hectares
    data.piBalance -= piAmount
    this.saveUserData(username, data)

    this.addTransaction(username, {
      type: "land",
      amount: piAmount,
      currency: "PI",
      description: `Land claim: ${hectares.toFixed(6)} hectares (${(hectares * 2.471).toFixed(6)} acres)`,
      status: "completed",
    })

    return newClaim
  }

  static convertPiToErt(username: string, piAmount: number, conversionRate: number = 5): number {
    const data = this.getUserData(username)
    if (data.piBalance < piAmount) {
      throw new Error("Insufficient Pi balance")
    }

    const ertAmount = piAmount * conversionRate
    data.piBalance -= piAmount
    data.ertBalance += ertAmount

    this.addTransaction(username, {
      type: "convert",
      amount: piAmount,
      currency: "PI",
      description: `Converted ${piAmount} Pi to ${ertAmount} ERT`,
      status: "completed",
    })

    this.addTransaction(username, {
      type: "convert",
      amount: ertAmount,
      currency: "ERT",
      description: `Received ${ertAmount} ERT from ${piAmount} Pi`,
      status: "completed",
    })

    this.saveUserData(username, data)
    return ertAmount
  }
}
