"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function TeosGoldReserve() {
  const [miniTGR, setMiniTGR] = useState(0)
  const [isMining, setIsMining] = useState(false)

  const handleMine = () => {
    setIsMining(true)
    setTimeout(() => {
      const earned = Math.floor(Math.random() * 5) + 1
      setMiniTGR((prev) => prev + earned)
      setIsMining(false)
      alert(`You earned ${earned} Mini TGR!`)
    }, 2000)
  }

  return (
    <div className="space-y-6">
      {/* TEOS Gold Reserve Header */}
      <div className="bg-gradient-to-br from-[#B8860B] via-[#DAA520] to-[#FFD700] p-6 rounded-2xl text-white">
        <h2 className="text-2xl font-bold mb-2">TEOS Gold Reserve ($TGR)</h2>
        <p className="text-sm opacity-90">The Gold of the Pharaohs</p>
        <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <p className="text-xs mb-2">Each $TGR = 1 gram of 99.99% pure gold</p>
          <div className="flex items-center justify-between">
            <span className="text-sm">Your Mini TGR</span>
            <span className="text-2xl font-bold">{miniTGR}</span>
          </div>
        </div>
      </div>

      {/* Mint TGR */}
      <Card className="p-6 border-[#B8860B]/20">
        <h3 className="font-semibold mb-4 text-[#B8860B]">Mint $TGR Tokens</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Mint $TGR tokens with physical gold or redeem tokens for gold
        </p>
        <div className="bg-secondary/50 p-4 rounded-lg mb-4">
          <p className="text-xs text-muted-foreground mb-2">Estimated to mint</p>
          <p className="text-2xl font-bold">~10 $TGR</p>
        </div>
        <Button className="w-full bg-[#B8860B] hover:bg-[#DAA520]">Mint Tokens</Button>
      </Card>

      {/* Mining */}
      <Card className="p-6 border-[#B8860B]/20">
        <h3 className="font-semibold mb-4 text-[#B8860B]">Mine Mini TGR</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Earn Mini TGR rewards based on your civic badge and activity
        </p>
        <Button onClick={handleMine} disabled={isMining} className="w-full bg-[#FFD700] text-black hover:bg-[#DAA520]">
          {isMining ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Mining...
            </span>
          ) : (
            "Start Mining (1 Hour)"
          )}
        </Button>
      </Card>

      {/* Swap */}
      <Card className="p-6 border-[#B8860B]/20">
        <h3 className="font-semibold mb-4 text-[#B8860B]">Swap MiniTGR</h3>
        <p className="text-sm text-muted-foreground mb-4">Swap your mined MiniTGR for other ecosystem tokens</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
            <span className="text-sm">MiniTGR Balance</span>
            <span className="font-semibold">{miniTGR}</span>
          </div>
          <Button className="w-full bg-transparent" variant="outline">
            Swap Tokens
          </Button>
        </div>
      </Card>

      {/* Gold Reserve Details */}
      <Card className="p-6 border-[#B8860B]/20">
        <h3 className="font-semibold mb-4 text-[#B8860B]">Physical Gold Reserve</h3>
        <p className="text-sm text-muted-foreground mb-4">Live details of the physical gold backing $TGR tokens</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Gold</span>
            <span className="font-semibold">0 grams</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total $TGR</span>
            <span className="font-semibold">0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Reserve Ratio</span>
            <span className="font-semibold text-green-500">100%</span>
          </div>
        </div>
      </Card>

      {/* Link to Full Studio */}
      <Card className="p-6 bg-gradient-to-br from-[#B8860B]/10 to-[#FFD700]/10 border-[#B8860B]/20">
        <div className="text-center">
          <h3 className="font-semibold mb-2">Full TEOS Gold Reserve Studio</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Access the complete TEOS ecosystem with advanced features
          </p>
          <Button
            onClick={() => window.open("https://studio--studio-8546176901-640e7.us-central1.hosted.app/", "_blank")}
            className="w-full bg-[#B8860B] hover:bg-[#DAA520]"
          >
            Open Full Studio
          </Button>
        </div>
      </Card>
    </div>
  )
}
