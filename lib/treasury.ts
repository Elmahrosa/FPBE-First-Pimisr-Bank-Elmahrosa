// FPBE Bank Treasury Module - Exact configuration from founder declaration
// Location: Alexandria, Egypt - 110 acres
// Valuation: $200M USD
// Conversion: 1 Pi = 5 ERT
// Declared by: Founder Ayman Seif

import { TOKEN_CONFIG } from "./token-config"

export const TREASURY = {
  valuation: {
    land_location: "Alexandria, Egypt",
    land_size_acres: 110,
    land_market_value_usd: 200000000,
    conversion_rule: "1 Pi = 5 ERT",
    declared_by: "Founder Ayman Seif",
    timestamp: "2025-11-16T06:18:00+02:00",
  },
  pricing_tiers: {
    community: {
      pi: 44500,
      ert: 222500,
      description: "Contributor symbolic rate (1000 Pi per hectare)",
    },
    fixed: {
      pi: 1000000000,
      ert: 5000000000,
      description: "Fixed anchor rate at $0.20 per Pi",
    },
    market: {
      pi: 200000000,
      ert: 1000000000,
      description: "Live market rate at $1.00 per Pi",
    },
  },
  tokens: TOKEN_CONFIG,
  balances: {
    pi: "dynamic from wallet",
    ert: "dynamic from conversion",
    elmahrosa: "dynamic from wallet",
  },
  transactions: [
    {
      type: "founder_payment",
      token: "ERT",
      amount: 200000000,
      purpose: "Land acquisition for Elmahrosa Pi Smart City",
      status: "confirmed",
      timestamp: "2025-11-16T06:18:00+02:00",
    },
  ],
  display: {
    show_dual_pricing: true,
    labels: {
      community_price: "Community contributor rate",
      fixed_price: "Fixed anchor rate",
      market_price: "Live market rate",
    },
  },
}

export function piToErt(piAmount: number): number {
  return piAmount * TOKEN_CONFIG.conversion.pi_to_ert
}

export function ertToPi(ertAmount: number): number {
  return ertAmount * TOKEN_CONFIG.conversion.ert_to_pi
}

export function piToTut(piAmount: number): number {
  return piAmount * TOKEN_CONFIG.conversion.pi_to_tut
}

export function getTreasurySnapshot(piUsdLive: number = 1.0) {
  return {
    valuation: TREASURY.valuation,
    pricing: {
      community: TREASURY.pricing_tiers.community,
      fixed: TREASURY.pricing_tiers.fixed,
      market: {
        ...TREASURY.pricing_tiers.market,
        pi: Math.round(TREASURY.valuation.land_market_value_usd / piUsdLive),
        ert: Math.round((TREASURY.valuation.land_market_value_usd / piUsdLive) * 5),
        description: `Live market rate at $${piUsdLive.toFixed(2)} per Pi`,
      },
    },
    conversion: TOKEN_CONFIG.conversion,
    activeTokens: TOKEN_CONFIG.active,
    legacyTokens: TOKEN_CONFIG.legacy,
  }
}
