"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { WalletConnect, OracleFeed } from "@/lib/pi-sdk"
import { BankLauncher } from "@/lib/launch"

interface SmartCityViewProps {
  onBack: () => void
}

export function SmartCityView({ onBack }: SmartCityViewProps) {
  const [balances, setBalances] = useState({ pi: 0, ert: 0, elmahrosa: 0, teos: 0 })
  const [piPrice, setPiPrice] = useState(0.2)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadTokenData()
  }, [])

  async function loadTokenData() {
    try {
      const wallet = new WalletConnect()
      const allBalances = await wallet.getAllBalances()
      setBalances(allBalances)

      const oracle = new OracleFeed("pi_usd")
      const price = await oracle.getPrice()
      setPiPrice(price)
    } catch (error) {
      console.error("[v0] Error loading token data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <h2 className="text-2xl font-bold">ElMahrosa Smart City</h2>
      </div>

      {/* Hero Section */}
      <Card className="p-6 bg-gradient-to-br from-[#B8860B] via-[#DAA520] to-[#FFD700] text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-2xl font-bold">Egypt's Digital Resurrection</h3>
            <p className="text-sm opacity-90">Powered by Pi Network & FPBE Bank</p>
          </div>
        </div>
        <p className="text-sm opacity-90 mb-4">
          ElMahrosa Smart City is Egypt's mythic digital resurrection—a civic-first ecosystem where verified
          contributors build the future with Pi, TEOS tokens, and verified land claims across MENA and Africa.
        </p>
        <Button
          variant="secondary"
          className="w-full bg-white text-[#B8860B] hover:bg-white/90"
          onClick={() => window.open("https://github.com/Elmahrosa/ElMahrosa-Pi-Smart-City", "_blank")}
        >
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          View on GitHub
        </Button>
      </Card>

      {/* Project Stats */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Your Token Holdings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-[#B8860B]">{balances.pi.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pi Balance</p>
            <p className="text-xs text-[#B8860B] font-medium mt-1">${(balances.pi * piPrice).toFixed(2)} USD</p>
          </div>
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-[#DAA520]">{balances.ert.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">ERT Balance</p>
            <p className="text-xs text-[#DAA520] font-medium mt-1">1 Pi = 5 ERT</p>
          </div>
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-[#FFD700]">{balances.elmahrosa.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">ELMAHROSA</p>
            <p className="text-xs text-[#FFD700] font-medium mt-1">Civic Token</p>
          </div>
          <div className="bg-muted rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-[#B8860B]">{balances.teos.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">TEOS Tokens</p>
            <p className="text-xs text-[#B8860B] font-medium mt-1">Gold Reserve</p>
          </div>
        </div>
      </Card>

      {/* Key Features */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Key Features</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <div className="w-10 h-10 rounded-full bg-[#B8860B]/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#B8860B]" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-sm">Verified Contributor System</p>
              <p className="text-xs text-muted-foreground">
                Badge logic, civic petitions, and verified-only access to ensure quality and prevent dilution
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <div className="w-10 h-10 rounded-full bg-[#DAA520]/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#DAA520]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-sm">Land Acquisition Program</p>
              <p className="text-xs text-muted-foreground">
                Every Pi contribution funds verified Egyptian land for TEOS banks, contributor hubs, and marketplaces
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <div className="w-10 h-10 rounded-full bg-[#FFD700]/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-[#FFD700]">π</span>
            </div>
            <div>
              <p className="font-medium text-sm">Pi Network Integration</p>
              <p className="text-xs text-muted-foreground">
                Native Pi wallet, staking, mining, and TEOS token ecosystem for the official Pi bank
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <div className="w-10 h-10 rounded-full bg-[#B8860B]/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#B8860B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-sm">MENA & Africa Expansion</p>
              <p className="text-xs text-muted-foreground">
                Regional contributor maps, localized banking services, and cross-border Pi transactions
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Roadmap */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Development Roadmap</h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-[#B8860B] flex items-center justify-center text-white text-xs font-bold">
                ✓
              </div>
              <div className="w-0.5 h-full bg-[#B8860B] mt-2" />
            </div>
            <div className="pb-6">
              <Badge className="bg-[#B8860B] text-white mb-2">Q1 2025 - Complete</Badge>
              <p className="font-medium text-sm">Foundation Phase</p>
              <p className="text-xs text-muted-foreground">
                FPBE Bank launch, Pi wallet integration, verified contributor system
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-[#DAA520] flex items-center justify-center text-white text-xs font-bold">
                2
              </div>
              <div className="w-0.5 h-full bg-[#DAA520] mt-2" />
            </div>
            <div className="pb-6">
              <Badge className="bg-[#DAA520] text-white mb-2">Q2 2025 - In Progress</Badge>
              <p className="font-medium text-sm">Land Acquisition</p>
              <p className="text-xs text-muted-foreground">
                Reach 1,250 hectares, establish first TEOS bank branches in Cairo
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">
                3
              </div>
              <div className="w-0.5 h-full bg-muted mt-2" />
            </div>
            <div className="pb-6">
              <Badge variant="outline" className="mb-2">
                Q3 2025 - Planned
              </Badge>
              <p className="font-medium text-sm">Smart City Infrastructure</p>
              <p className="text-xs text-muted-foreground">
                Contributor hubs, Pi marketplaces, and physical banking presence
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">
                4
              </div>
            </div>
            <div>
              <Badge variant="outline" className="mb-2">
                Q4 2025 - Planned
              </Badge>
              <p className="font-medium text-sm">Regional Expansion</p>
              <p className="text-xs text-muted-foreground">
                Expand to Alexandria, Giza, and other MENA regions with localized services
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Call to Action */}
      <Card className="p-6 bg-gradient-to-br from-[#B8860B]/10 to-[#FFD700]/10 border-[#B8860B]/20">
        <h3 className="font-semibold mb-2">Join the Movement</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Become a verified contributor and help build Egypt's digital future. Every Pi contribution is sacred and
          mapped to real land acquisition.
        </p>
        <div className="flex gap-2">
          <Button className="flex-1 bg-gradient-to-r from-[#B8860B] to-[#DAA520] text-white">
            Submit Civic Petition
          </Button>
          <Button
            variant="outline"
            className="flex-1 bg-transparent"
            onClick={() => window.open("https://firstpimisrbanke1502.pinet.com", "_blank")}
          >
            Visit Website
          </Button>
        </div>
      </Card>
    </div>
  )
}
