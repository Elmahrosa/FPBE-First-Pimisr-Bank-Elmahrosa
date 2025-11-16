// Token modules for FPBE Bank
export interface Token {
  symbol: string
  name: string
  balance: number
  price: number // in Pi
  description: string
  color: string
}

export const TOKENS = {
  ERT: {
    symbol: "ERT",
    name: "Egyptian Reserve Token",
    description: "Stable civic payment token pegged to Egyptian land value",
    color: "#B8860B",
  },
  TEOS: {
    symbol: "TEOS",
    name: "TEOS Gold Reserve",
    description: "Governance and energy token backed by gold reserves",
    color: "#FFD700",
  },
  TUT: {
    symbol: "TUT",
    name: "Tutankhamun Token",
    description: "Cultural badge fuel for heritage preservation",
    color: "#CD7F32",
  },
  TGR: {
    symbol: "TGR",
    name: "TEOS Gold Reserve Layer",
    description: "Gold-backed reserve layer for stability",
    color: "#DAA520",
  },
  DOLPHIN: {
    symbol: "DOLPHIN",
    name: "Dolphin Token",
    description: "Environmental impact and sustainability token",
    color: "#4682B4",
  },
}

export class TokenStore {
  private static STORAGE_KEY = "fpbe_tokens"

  static getUserTokens(username: string): Record<string, number> {
    if (typeof window === "undefined") {
      return this.getDefaultTokens()
    }

    const stored = localStorage.getItem(`${this.STORAGE_KEY}_${username}`)
    if (stored) {
      return JSON.parse(stored)
    }

    return this.getDefaultTokens()
  }

  static getDefaultTokens(): Record<string, number> {
    return {
      ERT: 0,
      TEOS: 0,
      TUT: 0,
      TGR: 0,
      DOLPHIN: 0,
    }
  }

  static saveUserTokens(username: string, tokens: Record<string, number>) {
    if (typeof window === "undefined") return
    localStorage.setItem(`${this.STORAGE_KEY}_${username}`, JSON.stringify(tokens))
  }

  static updateTokenBalance(username: string, tokenSymbol: string, amount: number) {
    const tokens = this.getUserTokens(username)
    tokens[tokenSymbol] = (tokens[tokenSymbol] || 0) + amount
    this.saveUserTokens(username, tokens)
  }

  static swapPiToToken(username: string, piAmount: number, tokenSymbol: string): number {
    // Conversion rates (1 Pi = X tokens)
    const rates: Record<string, number> = {
      ERT: 100, // 1 Pi = 100 ERT (stable)
      TEOS: 10, // 1 Pi = 10 TEOS
      TUT: 50, // 1 Pi = 50 TUT
      TGR: 5, // 1 Pi = 5 TGR (gold-backed)
      DOLPHIN: 25, // 1 Pi = 25 DOLPHIN
    }

    const tokenAmount = piAmount * (rates[tokenSymbol] || 1)
    this.updateTokenBalance(username, tokenSymbol, tokenAmount)
    return tokenAmount
  }
}
