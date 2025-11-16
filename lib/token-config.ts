// FPBE Bank - Complete Token Configuration
// Active Tokens: PI, ERT, TUT, USD, USDT
// Legacy: TEOS
// Conversion: 1 Pi = 5 ERT
// Refresh: Every 5 minutes

export const TOKEN_CONFIG = {
  tokens: {
    active: ["PI", "ERT", "TUT", "USD", "USDT"],
    legacy: ["TEOS"],
  },
  conversion: {
    pi_to_ert: 5,
    ert_to_pi: 0.2,
    usd_anchor_usd: 200000000,
    usdt_mirrors_usd: true,
  },
  price_sources: {
    PI: { type: "coingecko", id: "pi-network" },
    USDT: { type: "coingecko", id: "tether" },
    USD: { type: "fx", pair: "USD_EGP" },
    ERT: { type: "fixed", rule: "ERT = 5 × PI" },
    TUT: {
      type: "dexlab",
      url: "https://app.dexlab.space/token-hub/DHJkzU4yVpBMtDGs78hmw5KSYvfpQ2Jfqd8j7y8fSZ9m",
    },
    TEOS: {
      type: "dexlab",
      url: "https://app.dexlab.space/token-hub/Gvce3ukeWYDprBeVtYrqUVdgMcRGADWSkX5vCKMQG3b5",
    },
  },
  display_order: ["PI", "ERT", "TUT", "USD", "USDT"],
  icons: {
    PI: "/assets/icons/pi.svg",
    ERT: "/assets/icons/ert.svg",
    TUT: "/assets/icons/tut.svg",
    USD: "/assets/icons/usd.svg",
    USDT: "/assets/icons/usdt.svg",
    TEOS: "/assets/icons/teos.svg",
    FOUNDER: "/assets/icons/founder.svg",
  },
  wallets: {
    user_wallet: {
      source: "pi_sdk",
      show_real_balance: true,
      show_locked_balance: true,
      verified_badge: "🟢",
    },
    admin_wallet: {
      address: "0xaams1969",
      label: "Founder Ayman Seif",
      icon: "/assets/icons/founder.svg",
      verified: true,
      checkmark: "🟢",
    },
  },
  land_acquisition: {
    location: "Alexandria, Egypt",
    total_acres: 110,
    total_square_meters: 445154, // 110 acres = 445,154 m²
    price_per_m2_usd: 500,
    price_per_m2_pi: 2273,
    price_per_m2_usdt: 500,
    price_per_m2_ert: 11365,
    min_share_m2: 1,
    max_share_m2: 50,
    description: "Civic shares between 1 m² and 50 m² at $500 per m²",
  },
  refresh_interval_minutes: 5,
  support: {
    whatsapp: "+201006167293",
    label: "FPBE Bank Support (Founder Line)",
  },
} as const

export type TokenSymbol = "PI" | "ERT" | "TUT" | "USD" | "USDT" | "TEOS" | "FOUNDER"

export function getTokenIcon(symbol: TokenSymbol): string {
  return TOKEN_CONFIG.icons[symbol] || "/assets/icons/default.svg"
}

export function isActiveToken(symbol: string): boolean {
  return TOKEN_CONFIG.tokens.active.includes(symbol as TokenSymbol)
}

export function isLegacyToken(symbol: string): boolean {
  return TOKEN_CONFIG.tokens.legacy.includes(symbol as TokenSymbol)
}

export function getDisplayOrder(): TokenSymbol[] {
  return TOKEN_CONFIG.display_order as TokenSymbol[]
}

export function getRefreshInterval(): number {
  return TOKEN_CONFIG.refresh_interval_minutes * 60 * 1000
}

export function getLandPricePerM2(currency: "PI" | "ERT" | "USD" | "USDT"): number {
  const key = `price_per_m2_${currency.toLowerCase()}` as keyof typeof TOKEN_CONFIG.land_acquisition
  return TOKEN_CONFIG.land_acquisition[key] as number
}

export function getLandShareLimits(): { min: number; max: number } {
  return {
    min: TOKEN_CONFIG.land_acquisition.min_share_m2,
    max: TOKEN_CONFIG.land_acquisition.max_share_m2,
  }
}

export function getSupportContact(): { whatsapp: string; label: string } {
  return TOKEN_CONFIG.support
}

export function getTotalLandArea(): { acres: number; square_meters: number } {
  return {
    acres: TOKEN_CONFIG.land_acquisition.total_acres,
    square_meters: TOKEN_CONFIG.land_acquisition.total_square_meters,
  }
}

export function calculateLandCost(squareMeters: number, currency: "PI" | "ERT" | "USD" | "USDT"): number {
  const pricePerM2 = getLandPricePerM2(currency)
  return squareMeters * pricePerM2
}

export function validateLandShare(squareMeters: number): { valid: boolean; message: string } {
  const limits = getLandShareLimits()
  if (squareMeters < limits.min) {
    return { valid: false, message: `Minimum share is ${limits.min} m²` }
  }
  if (squareMeters > limits.max) {
    return { valid: false, message: `Maximum share is ${limits.max} m²` }
  }
  return { valid: true, message: "Valid share size" }
}
