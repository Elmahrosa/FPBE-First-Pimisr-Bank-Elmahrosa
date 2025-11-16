// FPBE Bank – Land Valuation Module
// Founder Declaration: Alexandria 110 acres = $200M USD anchor
// Update: 1 Pi = 5 ERT conversion

export const LAND_MARKET_VALUE_USD = 200_000_000 // $200M anchor valuation
export const FIXED_PI_USD = 0.2 // fixed reference rate $0.20
export const CIVIC_PI_PER_HECTARE = 1000 // symbolic civic rate
export const HECTARES_TOTAL = 44.52 // 110 acres ≈ 44.5 hectares
export const ERT_PER_PI = 5 // 1 Pi = 5 ERT conversion

export interface PricingSnapshot {
  usdAnchor: string
  piAtFixed020: number
  piAtLive: number
  civicPiTotal: number
  ertAtFixed: number
  ertAtLive: number
  ertAtCivic: number
}

// Pi required at fixed $0.20/Pi rate
export function piRequiredFixed(): number {
  return Math.round(LAND_MARKET_VALUE_USD / FIXED_PI_USD)
}

// Pi required at live Pi/USD rate
export function piRequiredLive(piUsdLive: number): number {
  return Math.round(LAND_MARKET_VALUE_USD / piUsdLive)
}

// Symbolic civic price: 1000 Pi per hectare
export function civicTotalPi(): number {
  return Math.round(CIVIC_PI_PER_HECTARE * HECTARES_TOTAL)
}

// Convert Pi to ERT at fixed 1 Pi = 5 ERT
export function piToErt(piAmount: number): number {
  return Math.round(piAmount * ERT_PER_PI)
}

// Convert ERT to Pi
export function ertToPi(ertAmount: number): number {
  return ertAmount / ERT_PER_PI
}

// Return full pricing snapshot for dashboard display
export function getPricingSnapshot(piUsdLive: number): PricingSnapshot {
  const fixedPi = piRequiredFixed()
  const livePi = piRequiredLive(piUsdLive)
  const civicPi = civicTotalPi()

  return {
    usdAnchor: `$${LAND_MARKET_VALUE_USD.toLocaleString()} USD`,
    piAtFixed020: fixedPi,
    piAtLive: livePi,
    civicPiTotal: civicPi,
    ertAtFixed: piToErt(fixedPi),
    ertAtLive: piToErt(livePi),
    ertAtCivic: piToErt(civicPi),
  }
}
