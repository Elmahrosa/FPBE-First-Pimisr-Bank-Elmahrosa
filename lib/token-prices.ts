"use client"

import { TOKEN_CONFIG, getRefreshInterval } from "./token-config"

export interface TokenPrice {
  usd: number
  change24h: number
  lastUpdated: Date
  source: string
}

export interface AllTokenPrices {
  PI: TokenPrice
  ERT: TokenPrice
  TUT: TokenPrice
  USD: TokenPrice
  USDT: TokenPrice
  TEOS?: TokenPrice
  CUSTOM_A?: TokenPrice
}

const CACHE_KEY = "fpbe_token_prices"
const CACHE_DURATION = getRefreshInterval()

const COINGECKO = "https://api.coingecko.com/api/v3/simple/price"
const FX_USD_EGP = "https://open.er-api.com/v6/latest/USD"

async function getCoingecko(ids: string[], vs = "usd"): Promise<Record<string, number>> {
  try {
    const url = `${COINGECKO}?ids=${ids.join(",")}&vs_currencies=${vs}&include_24hr_change=true`
    const res = await fetch(url)
    const json = await res.json()
    const out: Record<string, number> = {}
    ids.forEach((id) => {
      out[id] = json[id]?.[vs] ?? 0
    })
    return out
  } catch (error) {
    console.error("[v0] CoinGecko fetch failed:", error)
    return {}
  }
}

async function getUsdEgp(): Promise<number> {
  try {
    const res = await fetch(FX_USD_EGP)
    const json = await res.json()
    return json?.rates?.EGP ?? 47.15
  } catch (error) {
    console.error("[v0] USD/EGP fetch failed:", error)
    return 47.15 // fallback to known rate
  }
}

async function getDexlabPrice(hubUrl: string): Promise<number> {
  try {
    const res = await fetch(hubUrl, { mode: "no-cors" })
    const html = await res.text()
    const match =
      html.match(/Price:\s*\$?([0-9.]+)/i) ||
      html.match(/([0-9.]+)\s*USD/i) ||
      html.match(/"price":\s*"?([0-9.]+)"?/i)
    return match ? parseFloat(match[1]) : 0
  } catch (error) {
    console.error("[v0] DexLab fetch failed:", error)
    return 0
  }
}

export class TokenPriceService {
  static async getAllPrices(): Promise<AllTokenPrices> {
    // Check cache first
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const data = JSON.parse(cached)
        const age = Date.now() - new Date(data.timestamp || 0).getTime()
        if (age < CACHE_DURATION) {
          return {
            PI: { ...data.PI, lastUpdated: new Date(data.PI.lastUpdated) },
            ERT: { ...data.ERT, lastUpdated: new Date(data.ERT.lastUpdated) },
            TUT: { ...data.TUT, lastUpdated: new Date(data.TUT.lastUpdated) },
            USD: { ...data.USD, lastUpdated: new Date(data.USD.lastUpdated) },
            USDT: { ...data.USDT, lastUpdated: new Date(data.USDT.lastUpdated) },
            TEOS: data.TEOS ? { ...data.TEOS, lastUpdated: new Date(data.TEOS.lastUpdated) } : undefined,
            CUSTOM_A: data.CUSTOM_A ? { ...data.CUSTOM_A, lastUpdated: new Date(data.CUSTOM_A.lastUpdated) } : undefined,
          }
        }
      }
    }

    try {
      // Fetch all prices in parallel
      const [cgPrices, usdEgp, tutPrice, teosPrice, customAPrice] = await Promise.all([
        getCoingecko(["pi-network", "tether"], "usd"),
        getUsdEgp(),
        getDexlabPrice(TOKEN_CONFIG.price_sources.TUT.url),
        getDexlabPrice(TOKEN_CONFIG.price_sources.TEOS.url),
        getDexlabPrice(TOKEN_CONFIG.price_sources.CUSTOM_A.url),
      ])

      const piUsd = cgPrices["pi-network"] || 0.5
      const usdtUsd = cgPrices["tether"] || 0.999

      const ertPerPi = TOKEN_CONFIG.conversion.pi_to_ert
      const ertUsd = piUsd / ertPerPi

      const prices: AllTokenPrices & { timestamp: number } = {
        PI: {
          usd: piUsd,
          change24h: 0,
          lastUpdated: new Date(),
          source: "coingecko",
        },
        ERT: {
          usd: ertUsd,
          change24h: 0,
          lastUpdated: new Date(),
          source: "calculated",
        },
        TUT: {
          usd: tutPrice,
          change24h: 0,
          lastUpdated: new Date(),
          source: "dexlab",
        },
        USD: {
          usd: usdEgp,
          change24h: 0,
          lastUpdated: new Date(),
          source: "fx",
        },
        USDT: {
          usd: usdtUsd,
          change24h: 0,
          lastUpdated: new Date(),
          source: "coingecko",
        },
        TEOS: {
          usd: teosPrice,
          change24h: 0,
          lastUpdated: new Date(),
          source: "dexlab",
        },
        CUSTOM_A: {
          usd: customAPrice,
          change24h: 0,
          lastUpdated: new Date(),
          source: "dexlab",
        },
        timestamp: Date.now(),
      }

      // Cache the results
      if (typeof window !== "undefined") {
        localStorage.setItem(CACHE_KEY, JSON.stringify(prices))
      }

      return prices
    } catch (error) {
      console.error("[v0] Failed to fetch token prices:", error)
      // Return fallback prices
      return {
        PI: { usd: 0.5, change24h: 0, lastUpdated: new Date(), source: "fallback" },
        ERT: { usd: 0.1, change24h: 0, lastUpdated: new Date(), source: "fallback" },
        TUT: { usd: 0, change24h: 0, lastUpdated: new Date(), source: "fallback" },
        USD: { usd: 1.0, change24h: 0, lastUpdated: new Date(), source: "fallback" },
        USDT: { usd: 0.999, change24h: 0, lastUpdated: new Date(), source: "fallback" },
      }
    }
  }

  static async fetchPiPrice(): Promise<TokenPrice> {
    const prices = await this.getAllPrices()
    return prices.PI
  }

  static async fetchUsdtPrice(): Promise<TokenPrice> {
    const prices = await this.getAllPrices()
    return prices.USDT
  }

  static async fetchUsdEgpRate(): Promise<TokenPrice> {
    const prices = await this.getAllPrices()
    return prices.USD
  }

  static calculateErtPrice(piPrice: TokenPrice): TokenPrice {
    return {
      usd: piPrice.usd / TOKEN_CONFIG.conversion.pi_to_ert,
      change24h: piPrice.change24h,
      lastUpdated: piPrice.lastUpdated,
      source: "calculated",
    }
  }
}

export async function getLivePrices() {
  const prices = await TokenPriceService.getAllPrices()
  
  return {
    PI_USD: prices.PI.usd,
    ERT_USD: prices.ERT.usd,
    TUT_USD: prices.TUT.usd,
    USD_EGP: prices.USD.usd,
    USDT_USD: prices.USDT.usd,
    TEOS_USD: prices.TEOS?.usd || 0,
    CUSTOM_A_USD: prices.CUSTOM_A?.usd || 0
  }
}
