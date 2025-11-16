"use client"

export interface PiPrice {
  usd: number
  change24h: number
  lastUpdated: Date
}

const PRICE_CACHE_KEY = "fpbe_pi_price"
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export class PiPriceService {
  static async getLivePrice(): Promise<PiPrice> {
    // Check cache first
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(PRICE_CACHE_KEY)
      if (cached) {
        const data = JSON.parse(cached)
        const age = Date.now() - new Date(data.lastUpdated).getTime()
        if (age < CACHE_DURATION) {
          return {
            ...data,
            lastUpdated: new Date(data.lastUpdated),
          }
        }
      }
    }

    try {
      // Try to fetch from CoinGecko API (Pi Network)
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=pi-network&vs_currencies=usd&include_24hr_change=true",
      )

      if (response.ok) {
        const data = await response.json()
        const price: PiPrice = {
          usd: data["pi-network"]?.usd || 0.5, // Fallback to $0.50
          change24h: data["pi-network"]?.usd_24h_change || 0,
          lastUpdated: new Date(),
        }

        if (typeof window !== "undefined") {
          localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(price))
        }

        return price
      }
    } catch (error) {
      console.error("[v0] Failed to fetch Pi price:", error)
    }

    // Fallback price
    const fallbackPrice: PiPrice = {
      usd: 0.5,
      change24h: 0,
      lastUpdated: new Date(),
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(fallbackPrice))
    }

    return fallbackPrice
  }
}
