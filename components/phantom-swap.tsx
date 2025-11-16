"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { connectPhantom } from "@/lib/phantom-wallet"
import { CONFIG } from "@/lib/config"

export function PhantomSwap() {
  const [phantomAddress, setPhantomAddress] = useState<string | null>(null)
  const [swapAmount, setSwapAmount] = useState("")
  const [swapToken, setSwapToken] = useState<"ERT" | "TEOS" | "TUT">("ERT")
  const [isLoading, setIsLoading] = useState(false)

  async function handleConnectPhantom() {
    setIsLoading(true)
    const address = await connectPhantom()
    setPhantomAddress(address)
    setIsLoading(false)
  }

  async function handleSwap() {
    if (!swapAmount || !phantomAddress) return
    
    setIsLoading(true)
    const amount = parseFloat(swapAmount)
    const rate = CONFIG.swapRates[swapToken]
    const fee = CONFIG.swapFee
    const feeAmount = amount * fee
    const netAmount = amount - feeAmount
    const toAmount = netAmount * rate

    // Log transaction
    console.log("[v0] Swap transaction:", {
      from: "PI",
      to: swapToken,
      amount,
      fee: feeAmount,
      netAmount,
      toAmount,
      phantomAddress
    })

    alert(`Swapped ${netAmount.toFixed(2)} Pi → ${toAmount.toFixed(2)} ${swapToken}\nFee: ${feeAmount.toFixed(2)} Pi (${(fee * 100).toFixed(1)}%)`)
    setIsLoading(false)
    setSwapAmount("")
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Phantom Wallet Swap</h3>

      {!phantomAddress ? (
        <Button
          onClick={handleConnectPhantom}
          disabled={isLoading}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          <img src={CONFIG.icons.PHANTOM || "/placeholder.svg"} alt="Phantom" className="w-5 h-5 mr-2" />
          Connect Phantom Wallet
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">Connected Wallet</p>
            <p className="text-sm font-mono">{phantomAddress.slice(0, 8)}...{phantomAddress.slice(-8)}</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Select Token</label>
            <div className="flex gap-2">
              {(["ERT", "TEOS", "TUT"] as const).map((token) => (
                <button
                  key={token}
                  onClick={() => setSwapToken(token)}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    swapToken === token
                      ? "border-[#B8860B] bg-[#B8860B]/10"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <img src={CONFIG.icons[token] || "/placeholder.svg"} alt={token} className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-xs font-medium">{token}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Amount (Pi)</label>
            <input
              type="number"
              value={swapAmount}
              onChange={(e) => setSwapAmount(e.target.value)}
              placeholder="0.00"
              className="w-full p-3 border rounded-lg"
            />
            {swapAmount && (
              <p className="text-xs text-muted-foreground mt-2">
                You will receive: {((parseFloat(swapAmount) * (1 - CONFIG.swapFee)) * CONFIG.swapRates[swapToken]).toFixed(2)} {swapToken}
                <br />
                Fee: {(parseFloat(swapAmount) * CONFIG.swapFee).toFixed(2)} Pi ({(CONFIG.swapFee * 100).toFixed(1)}%)
              </p>
            )}
          </div>

          <Button
            onClick={handleSwap}
            disabled={!swapAmount || isLoading}
            className="w-full bg-gradient-to-r from-[#B8860B] to-[#DAA520]"
          >
            <img src={CONFIG.icons.SWAP || "/placeholder.svg"} alt="Swap" className="w-5 h-5 mr-2" />
            Swap Pi to {swapToken}
          </Button>
        </div>
      )}
    </Card>
  )
}
