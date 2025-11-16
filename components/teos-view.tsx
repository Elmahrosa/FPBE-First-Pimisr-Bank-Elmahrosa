"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TeosGoldReserve } from "@/components/teos-gold-reserve"

interface TeosViewProps {
  onBack: () => void
}

export function TeosView({ onBack }: TeosViewProps) {
  const [activeView, setActiveView] = useState<"overview" | "gold-reserve">("overview")

  const handleBuyTeos = () => {
    alert("Buy TEOS - Coming soon! Connect to Pi Network marketplace.")
  }

  const handleSwap = () => {
    alert("Swap TEOS - Coming soon! Exchange TEOS for Pi or other tokens.")
  }

  const handleStake = () => {
    alert("Stake TEOS - Coming soon! Lock your TEOS to earn 12% APY.")
  }

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold">TEOS Token</h2>
      </div>

      <div className="flex gap-2 mb-6">
        <Button
          onClick={() => setActiveView("overview")}
          variant={activeView === "overview" ? "default" : "outline"}
          className={activeView === "overview" ? "bg-[#B8860B] hover:bg-[#DAA520]" : ""}
        >
          Overview
        </Button>
        <Button
          onClick={() => setActiveView("gold-reserve")}
          variant={activeView === "gold-reserve" ? "default" : "outline"}
          className={activeView === "gold-reserve" ? "bg-[#B8860B] hover:bg-[#DAA520]" : ""}
        >
          Gold Reserve
        </Button>
      </div>

      {activeView === "overview" ? (
        <>
          <Card className="p-6 bg-gradient-to-br from-[#DAA520] to-[#FFD700] text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm opacity-90 mb-1">TEOS Balance</p>
                <h3 className="text-4xl font-bold">T 0.00</h3>
                <p className="text-sm opacity-90 mt-2">≈ $0.00 USD</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-4xl font-bold">T</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs opacity-90">24h Change</p>
                <p className="text-lg font-bold text-green-300">+0.0%</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs opacity-90">Market Cap</p>
                <p className="text-lg font-bold">TBA</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleBuyTeos} className="flex-1 bg-white text-[#DAA520] hover:bg-white/90">
                Buy TEOS
              </Button>
              <Button onClick={handleSwap} className="flex-1 bg-white/20 text-white hover:bg-white/30">
                Swap
              </Button>
            </div>
          </Card>

          <div>
            <h3 className="text-lg font-semibold mb-4">About TEOS</h3>
            <Card className="p-4 border-[#B8860B]/20">
              <p className="text-sm text-muted-foreground leading-relaxed">
                TEOS is the official utility token of First Pimisr Bank Elmahrosa (FPBE), built on the Pi Network
                blockchain. As the "son" of Pi, TEOS provides enhanced banking services, exclusive rewards, and
                governance rights within the FPBE ecosystem. Each TEOS token is backed by the TEOS Gold Reserve ($TGR),
                representing 1 gram of 99.99% pure gold - The Gold of the Pharaohs.
              </p>
            </Card>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">TEOS Benefits</h3>
            <div className="space-y-3">
              <Card className="p-4 border-[#B8860B]/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#DAA520]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#DAA520]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">Lower Loan Rates</h4>
                    <p className="text-sm text-muted-foreground">Get up to 2% discount on loan interest rates</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-[#B8860B]/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#FFD700]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">Higher Savings APY</h4>
                    <p className="text-sm text-muted-foreground">Earn up to 12% APY on TEOS savings</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-[#B8860B]/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#B8860B]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#B8860B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">Governance Rights</h4>
                    <p className="text-sm text-muted-foreground">Vote on FPBE platform decisions</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-[#B8860B]/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#DAA520]/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#DAA520]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">Exclusive Rewards</h4>
                    <p className="text-sm text-muted-foreground">Access premium features and cashback</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">TEOS Staking</h3>
            <Card className="p-4 bg-gradient-to-r from-[#DAA520]/10 to-[#FFD700]/10 border-[#B8860B]/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold">Stake TEOS</h4>
                  <p className="text-sm text-muted-foreground">Earn 12% APY</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#DAA520]">12%</p>
                  <p className="text-xs text-muted-foreground">APY</p>
                </div>
              </div>
              <Button onClick={handleStake} className="w-full bg-[#DAA520] text-white hover:bg-[#B8860B]">
                Stake Now
              </Button>
            </Card>
          </div>

          <Card className="p-6 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 text-white border-0">
            <div className="text-center">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold mb-2">Pi to the Moon!</h3>
              <p className="text-sm opacity-90 mb-4">
                Join the revolution as Pi Network and TEOS reach new heights. Together we build Egypt's digital future.
              </p>
              <div className="flex items-center justify-center gap-2 text-3xl font-bold">
                <span>π</span>
                <span>→</span>
                <span>🌙</span>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <TeosGoldReserve />
      )}
    </div>
  )
}
