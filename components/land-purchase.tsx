"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { getLivePrices } from "@/lib/token-prices"
import { CONFIG } from "@/lib/config"
import Image from "next/image"

export function LandPurchase() {
  const { user } = useAuth()
  const [area, setArea] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<"PI" | "ERT" | "USDT">("PI")
  const [prices, setPrices] = useState<any>({})
  const [loading, setLoading] = useState(false)

  useState(() => {
    getLivePrices().then(setPrices)
  })

  const usdTotal = CONFIG.price.land_price_per_m2_usd * area
  const piTotal = prices.PI_USD ? usdTotal / prices.PI_USD : 0
  const ertTotal = piTotal * CONFIG.conversion.pi_to_ert
  const usdtTotal = usdTotal

  const paymentAmounts = {
    PI: piTotal,
    ERT: ertTotal,
    USDT: usdtTotal
  }

  async function handlePurchase() {
    if (!user || area < CONFIG.land.min_share_m2 || area > CONFIG.land.max_share_m2) return

    setLoading(true)

    try {
      const amount = paymentAmounts[paymentMethod]
      
      // Create Pi payment
      await new Promise<string>((resolve, reject) => {
        if (typeof window !== "undefined" && window.Pi) {
          window.Pi.createPayment({
            identifier: `land-${Date.now()}`,
            amount: amount,
            memo: `Purchase ${area}m² land in Elmahrosa Smart City`,
            metadata: { 
              userId: user.uid, 
              type: "land_purchase", 
              area, 
              paymentMethod,
              amount 
            }
          }, {
            onReadyForServerApproval: (id) => resolve(id),
            onCancel: () => reject(new Error("Payment cancelled")),
            onError: (error) => reject(error)
          })
        } else {
          reject(new Error("Pi SDK not available"))
        }
      })

      alert(`Successfully purchased ${area}m² of land!`)
      setArea(1)
    } catch (error) {
      console.error("[v0] Purchase error:", error)
      alert("Purchase failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="font-semibold text-lg mb-2">Land Acquisition</h3>
        <p className="text-sm text-muted-foreground">
          {CONFIG.land.location} • ${CONFIG.price.land_price_per_m2_usd}/m²
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Select Area (m²) • Min: {CONFIG.land.min_share_m2} • Max: {CONFIG.land.max_share_m2}
          </label>
          <Input
            type="number"
            value={area}
            onChange={(e) => setArea(Math.max(CONFIG.land.min_share_m2, Math.min(CONFIG.land.max_share_m2, parseInt(e.target.value) || 1)))}
            min={CONFIG.land.min_share_m2}
            max={CONFIG.land.max_share_m2}
          />
        </div>

        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total USD:</span>
            <span className="font-semibold">${usdTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total Pi:</span>
            <span className="font-semibold">{piTotal.toFixed(0)} π</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total ERT:</span>
            <span className="font-semibold">{ertTotal.toFixed(0)} ERT</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total USDT:</span>
            <span className="font-semibold">{usdtTotal.toFixed(0)} USDT</span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Payment Method</label>
          <div className="grid grid-cols-3 gap-2">
            {(["PI", "ERT", "USDT"] as const).map((method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  paymentMethod === method
                    ? "border-[#B8860B] bg-[#B8860B]/10"
                    : "border-border hover:border-[#B8860B]/50"
                }`}
              >
                <Image 
                  src={CONFIG.icons[method] || "/placeholder.svg"} 
                  alt={method} 
                  width={24} 
                  height={24}
                  className="mx-auto mb-1"
                />
                <p className="text-xs font-medium">{method}</p>
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handlePurchase}
          disabled={loading || area < CONFIG.land.min_share_m2 || area > CONFIG.land.max_share_m2}
          className="w-full bg-gradient-to-r from-[#B8860B] to-[#DAA520] hover:from-[#DAA520] hover:to-[#FFD700] text-white"
          size="lg"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </div>
          ) : (
            `Purchase ${area}m² with ${paymentMethod}`
          )}
        </Button>
      </div>
    </Card>
  )
}
