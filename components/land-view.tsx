"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { DataStore, type LandClaim } from "@/lib/store"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PiPriceService } from "@/lib/pi-price"
import { TREASURY, getTreasurySnapshot, piToErt } from "@/lib/treasury"
import { TOKEN_CONFIG, getLandPricePerM2, getLandShareLimits, getTotalLandArea, calculateLandCost, validateLandShare } from "@/lib/token-config"
import { SwapERT } from "./swap-ert"
import { LandPurchase } from "./land-purchase"

interface LandViewProps {
  onBack: () => void
}

export function LandView({ onBack }: LandViewProps) {
  const { user } = useAuth()
  const [landClaims, setLandClaims] = useState<LandClaim[]>([])
  const [totalHectares, setTotalHectares] = useState(0)
  const [piBalance, setPiBalance] = useState(0)
  const [ertBalance, setErtBalance] = useState(0)
  const [showClaimDialog, setShowClaimDialog] = useState(false)
  const [claimAmount, setClaimAmount] = useState("")
  const [pricingMode, setPricingMode] = useState<"community" | "fixed" | "market">("community")
  const [livePiPrice, setLivePiPrice] = useState(1.0)

  const LAND_AREA = getTotalLandArea()
  const TOTAL_SQUARE_METERS = LAND_AREA.square_meters // 445,154 m²
  const TOTAL_ACRES = LAND_AREA.acres // 110 acres
  const TOTAL_PI_NEEDED = calculateLandCost(TOTAL_SQUARE_METERS, getLandPricePerM2("PI"))

  useEffect(() => {
    if (user) {
      const userData = DataStore.getUserData(user.username)
      setLandClaims(userData.landClaims)
      setTotalHectares(userData.totalLandHectares)
      setPiBalance(userData.piBalance)
      setErtBalance(userData.ertBalance)
    }
  }, [user])

  useEffect(() => {
    PiPriceService.getLivePrice().then((price) => {
      if (price) {
        setLivePiPrice(price.usd)
      }
    })
  }, [])

  const treasurySnapshot = getTreasurySnapshot(livePiPrice)

  const handleClaimLand = () => {
    if (!user || !claimAmount) return
    const amount = Number(claimAmount)
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount")
      return
    }
    if (amount > piBalance) {
      alert("Insufficient Pi balance!")
      return
    }

    // Calculate square meters from Pi contribution
    const squareMeters = amount / getLandPricePerM2("PI")
    
    // Validate share size
    const validation = validateLandShare(squareMeters)
    if (!validation.valid) {
      alert(validation.message)
      return
    }

    const newClaim = DataStore.claimLand(user.username, amount, getLandPricePerM2("PI"))
    const userData = DataStore.getUserData(user.username)
    setLandClaims(userData.landClaims)
    setTotalHectares(userData.totalLandHectares)
    setPiBalance(userData.piBalance)
    setShowClaimDialog(false)
    setClaimAmount("")
    alert(`Successfully claimed ${squareMeters.toFixed(2)} m² of verified Egyptian land!`)
  }

  const totalPiContributed = landClaims.reduce((sum, claim) => sum + claim.piContributed, 0)

  const LAND_PRICES = {
    pi_per_m2: getLandPricePerM2("PI"),
    ert_per_m2: getLandPricePerM2("ERT"),
    usd_per_m2: getLandPricePerM2("USD"),
    usdt_per_m2: getLandPricePerM2("USDT"),
  }

  const SHARE_LIMITS = getLandShareLimits()

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <h2 className="text-2xl font-bold">Land Acquisition</h2>
      </div>

      <SwapERT />
      
      <LandPurchase />

      <Card className="p-6 bg-gradient-to-br from-[#B8860B] via-[#DAA520] to-[#FFD700] text-white">
        <h3 className="text-2xl font-bold mb-2">{TREASURY.valuation.land_location}</h3>
        <p className="text-sm opacity-90 mb-4">
          Founder Declaration by {TREASURY.valuation.declared_by}
        </p>

        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-4">
          <h4 className="font-semibold mb-3">Land Valuation</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Market Value:</span>
              <span className="font-bold">${(TREASURY.valuation.land_market_value_usd / 1000000).toFixed(0)}M USD</span>
            </div>
            <div className="flex justify-between">
              <span>Total Area:</span>
              <span className="font-bold">{TOTAL_ACRES} acres ({TOTAL_SQUARE_METERS.toLocaleString()} m²)</span>
            </div>
            <div className="flex justify-between">
              <span>Conversion Rule:</span>
              <span className="font-bold">{TREASURY.valuation.conversion_rule}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-4">
          <h4 className="font-semibold mb-3">Land Pricing per Square Meter</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Pi Price:</span>
              <span className="font-bold">{LAND_PRICES.pi_per_m2.toLocaleString()} π/m²</span>
            </div>
            <div className="flex justify-between">
              <span>ERT Price:</span>
              <span className="font-bold">{LAND_PRICES.ert_per_m2.toLocaleString()} ERT/m²</span>
            </div>
            <div className="flex justify-between">
              <span>USD Price:</span>
              <span className="font-bold">${LAND_PRICES.usd_per_m2.toLocaleString()}/m²</span>
            </div>
            <div className="flex justify-between">
              <span>USDT Price:</span>
              <span className="font-bold">${LAND_PRICES.usdt_per_m2.toLocaleString()} USDT/m²</span>
            </div>
            <div className="mt-3 pt-3 border-t border-white/30">
              <p className="text-xs opacity-90">
                Enforceable civic shares: {SHARE_LIMITS.min} m² - {SHARE_LIMITS.max} m² per claim at ${LAND_PRICES.usd_per_m2}/m²
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-4">
          <h4 className="font-semibold mb-3">Pricing Options</h4>
          <div className="space-y-3">
            <button
              onClick={() => setPricingMode("community")}
              className={`w-full text-left p-3 rounded-lg transition-all ${
                pricingMode === "community" ? "bg-white/30" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold">{TREASURY.display.labels.community_price}</span>
                {pricingMode === "community" && <Badge className="bg-green-500">Active</Badge>}
              </div>
              <div className="text-xs opacity-90">
                <p>Total: {treasurySnapshot.pricing.community.pi.toLocaleString()} Pi</p>
                <p>= {treasurySnapshot.pricing.community.ert.toLocaleString()} ERT</p>
                <p className="mt-1 opacity-75">{treasurySnapshot.pricing.community.description}</p>
              </div>
            </button>

            <button
              onClick={() => setPricingMode("fixed")}
              className={`w-full text-left p-3 rounded-lg transition-all ${
                pricingMode === "fixed" ? "bg-white/30" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold">{TREASURY.display.labels.fixed_price}</span>
                {pricingMode === "fixed" && <Badge className="bg-blue-500">Reference</Badge>}
              </div>
              <div className="text-xs opacity-90">
                <p>Total: {(treasurySnapshot.pricing.fixed.pi / 1000000).toFixed(0)}M Pi</p>
                <p>= {(treasurySnapshot.pricing.fixed.ert / 1000000).toFixed(0)}M ERT</p>
                <p className="mt-1 opacity-75">{treasurySnapshot.pricing.fixed.description}</p>
              </div>
            </button>

            <button
              onClick={() => setPricingMode("market")}
              className={`w-full text-left p-3 rounded-lg transition-all ${
                pricingMode === "market" ? "bg-white/30" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold">{TREASURY.display.labels.market_price}</span>
                {pricingMode === "market" && <Badge className="bg-purple-500">Live</Badge>}
              </div>
              <div className="text-xs opacity-90">
                <p>Total: {(treasurySnapshot.pricing.market.pi / 1000000).toFixed(0)}M Pi</p>
                <p>= {(treasurySnapshot.pricing.market.ert / 1000000).toFixed(0)}M ERT</p>
                <p className="mt-1 opacity-75">{treasurySnapshot.pricing.market.description}</p>
              </div>
            </button>
          </div>
        </div>

        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Funding Progress (Community Rate)</span>
            <span className="text-sm">{((totalPiContributed / TOTAL_PI_NEEDED) * 100).toFixed(2)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div
              className="bg-white rounded-full h-3 transition-all"
              style={{ width: `${Math.min((totalPiContributed / TOTAL_PI_NEEDED) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-xs">
            <span>{totalPiContributed.toFixed(0)} π Raised</span>
            <span>{TOTAL_PI_NEEDED.toLocaleString()} π Goal</span>
          </div>
        </div>

        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Live Pi Price</span>
            <span className="text-lg font-bold">${livePiPrice.toFixed(4)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
            <p className="text-xs font-medium mb-1">Your Pi Balance</p>
            <p className="text-xl font-bold">π {piBalance.toFixed(2)}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
            <p className="text-xs font-medium mb-1">Your ERT Balance</p>
            <p className="text-xl font-bold">E {ertBalance.toFixed(2)}</p>
          </div>
        </div>

        <Button
          onClick={() => setShowClaimDialog(true)}
          className="w-full bg-white text-[#B8860B] hover:bg-white/90 font-semibold"
        >
          Claim Your Share Now
        </Button>

        <div className="text-xs opacity-90 space-y-1 mt-4">
          <p>✓ Verified land in {TREASURY.valuation.land_location}</p>
          <p>✓ {TREASURY.valuation.conversion_rule}</p>
          <p>✓ {TREASURY.pricing_tiers.community.description}</p>
          <p>✓ Linked to ElMahrosa Pi Smart City project</p>
          <p>✓ Contributors earn badges and governance rights</p>
        </div>
      </Card>

      {showClaimDialog && (
        <Card className="p-6 border-[#B8860B]">
          <h3 className="font-semibold mb-4">Claim Land Share</h3>
          <div className="space-y-4">
            <div>
              <Label>Amount of Pi to Contribute</Label>
              <Input
                type="number"
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
                placeholder="Enter Pi amount"
                className="mt-2"
              />
              {claimAmount && !isNaN(Number(claimAmount)) && (
                <p className="text-sm text-muted-foreground mt-2">
                  = {(Number(claimAmount) / LAND_PRICES.pi_per_m2).toFixed(2)} m²
                  <br />
                  = {piToErt(Number(claimAmount)).toFixed(2)} ERT
                  <br />
                  <span className="text-xs">
                    (Share limits: {SHARE_LIMITS.min}-{SHARE_LIMITS.max} m²)
                  </span>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleClaimLand} className="flex-1 bg-[#B8860B] text-white">
                Confirm Claim
              </Button>
              <Button onClick={() => setShowClaimDialog(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-[#B8860B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Your Land Claims
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-[#B8860B]">{totalHectares.toFixed(4)}</p>
            <p className="text-sm text-muted-foreground">Hectares Claimed</p>
          </div>
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-[#DAA520]">{totalPiContributed.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Pi Contributed</p>
          </div>
        </div>
        <div className="bg-[#B8860B]/10 rounded-lg p-4">
          <p className="text-sm font-medium mb-2">Conversion Rate</p>
          <p className="text-xs text-muted-foreground">
            110 acres = 445,154 m² of verified Egyptian land at $500/m²
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {TOKEN_CONFIG.land_acquisition.description}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Every Pi is logged and anchored to land acquisition for the ElMahrosa Smart City project in {TREASURY.valuation.land_location}.
          </p>
        </div>
      </Card>

      {landClaims.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Your Land Claims History</h3>
          <div className="space-y-3">
            {landClaims.map((claim) => (
              <div key={claim.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium text-sm">{claim.hectares.toFixed(4)} hectares</p>
                  <p className="text-xs text-muted-foreground">{claim.date.toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">π {claim.piContributed.toFixed(2)}</p>
                  <Badge
                    className={`text-xs ${
                      claim.status === "verified"
                        ? "bg-green-500"
                        : claim.status === "claimed"
                          ? "bg-blue-500"
                          : "bg-yellow-500"
                    }`}
                  >
                    {claim.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6 bg-gradient-to-br from-[#B8860B]/10 to-[#FFD700]/10 border-[#B8860B]/20">
        <h3 className="font-semibold mb-2">Contribute More Pi</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Increase your land claims by staking more Pi. Every contribution is verified and mapped to Egypt's civic
          terrain.
        </p>
        <Button className="w-full bg-gradient-to-r from-[#B8860B] to-[#DAA520] text-white">Stake Pi for Land</Button>
      </Card>
    </div>
  )
}
