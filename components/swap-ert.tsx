"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { CONFIG } from "@/lib/config"
import Image from "next/image"

export function SwapERT() {
  const { user } = useAuth()
  const [piAmount, setPiAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const ertAmount = piAmount ? (parseFloat(piAmount) * CONFIG.conversion.pi_to_ert).toFixed(2) : "0"

  async function handleSwap() {
    if (!user || !piAmount || parseFloat(piAmount) <= 0) return

    setLoading(true)
    setSuccess(false)

    try {
      // Create Pi payment
      const paymentId = await new Promise<string>((resolve, reject) => {
        if (typeof window !== "undefined" && window.Pi) {
          window.Pi.createPayment({
            identifier: `ert-swap-${Date.now()}`,
            amount: parseFloat(piAmount),
            memo: `Swap ${piAmount} Pi to ${ertAmount} ERT`,
            metadata: { userId: user.uid, type: "ert_swap", piAmount, ertAmount }
          }, {
            onReadyForServerApproval: (id) => resolve(id),
            onCancel: () => reject(new Error("Payment cancelled")),
            onError: (error) => reject(error)
          })
        } else {
          reject(new Error("Pi SDK not available"))
        }
      })

      // Update balances in localStorage
      const storedBalances = localStorage.getItem(`fpbe_balances_${user.username}`) || "{}"
      const balances = JSON.parse(storedBalances)
      balances.pi = (balances.pi || 0) - parseFloat(piAmount)
      balances.ert = (balances.ert || 0) + parseFloat(ertAmount)
      localStorage.setItem(`fpbe_balances_${user.username}`, JSON.stringify(balances))

      setSuccess(true)
      setPiAmount("")
      
      // Reload page to update balances
      setTimeout(() => window.location.reload(), 2000)
    } catch (error) {
      console.error("[v0] Swap error:", error)
      alert("Swap failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
          <Image src={CONFIG.icons.ERT || "/placeholder.svg"} alt="ERT" width={24} height={24} />
        </div>
        <div>
          <h3 className="font-semibold">Buy ERT with Pi</h3>
          <p className="text-sm text-muted-foreground">1 Pi = 5 ERT</p>
        </div>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">
            ✓ Successfully swapped {piAmount} Pi to {ertAmount} ERT!
          </p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Pi Amount</label>
          <div className="relative">
            <Input
              type="number"
              placeholder="0.00"
              value={piAmount}
              onChange={(e) => setPiAmount(e.target.value)}
              className="pr-12"
              min="0"
              step="0.01"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Image src={CONFIG.icons.PI || "/placeholder.svg"} alt="Pi" width={16} height={16} />
              <span className="text-sm font-medium">Pi</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">You Receive</label>
          <div className="relative">
            <Input
              type="text"
              value={ertAmount}
              readOnly
              className="pr-12 bg-muted"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Image src={CONFIG.icons.ERT || "/placeholder.svg"} alt="ERT" width={16} height={16} />
              <span className="text-sm font-medium">ERT</span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSwap}
          disabled={loading || !piAmount || parseFloat(piAmount) <= 0}
          className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </div>
          ) : (
            "Swap Now"
          )}
        </Button>
      </div>
    </Card>
  )
}
