"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ledger } from "@/lib/ledger"
import { CONFIG } from "@/lib/config"
import Image from "next/image"

export function AdminPanel({ phantomAddress }: { phantomAddress: string | null }) {
  const [showLedger, setShowLedger] = useState(false)
  
  const isAdmin = phantomAddress === CONFIG.admin.treasuryWallet

  if (!isAdmin) return null

  const handleExportLedger = () => {
    const data = ledger.exportLedger()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fpbe-ledger-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleMintTokens = () => {
    alert("Mint Tokens - This would trigger your SPL token minting contract on Solana")
  }

  const handleSendAirdrop = () => {
    alert("Send Airdrop - This would distribute tokens to verified contributors")
  }

  const stats = ledger.getStats()

  return (
    <Card className="p-6 mb-6 border-2 border-[#B8860B]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#B8860B] to-[#FFD700] flex items-center justify-center">
          <span className="text-white font-bold">A</span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#B8860B]">Admin Control Panel</h3>
          <p className="text-xs text-muted-foreground font-mono">
            {phantomAddress?.substring(0, 8)}...{phantomAddress?.substring(phantomAddress.length - 8)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="p-3 bg-[#B8860B]/10 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Total Swaps</p>
          <p className="text-2xl font-bold text-[#B8860B]">{stats.totalSwaps}</p>
        </div>
        <div className="p-3 bg-[#B8860B]/10 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Total Payments</p>
          <p className="text-2xl font-bold text-[#B8860B]">{stats.totalPayments}</p>
        </div>
        <div className="p-3 bg-[#B8860B]/10 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Land Joins</p>
          <p className="text-2xl font-bold text-[#B8860B]">{stats.totalLandJoins}</p>
        </div>
        <div className="p-3 bg-[#B8860B]/10 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Total Land m²</p>
          <p className="text-2xl font-bold text-[#B8860B]">{stats.totalLandM2.toFixed(0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Button
          onClick={handleMintTokens}
          className="bg-gradient-to-r from-[#B8860B] to-[#DAA520] text-white"
        >
          <Image src={CONFIG.icons.ERT || "/placeholder.svg"} alt="Mint" width={16} height={16} className="mr-2" />
          Mint Tokens
        </Button>
        
        <Button
          onClick={handleSendAirdrop}
          className="bg-gradient-to-r from-[#DAA520] to-[#FFD700] text-white"
        >
          <Image src={CONFIG.icons.PI || "/placeholder.svg"} alt="Airdrop" width={16} height={16} className="mr-2" />
          Send Airdrop
        </Button>
        
        <Button
          onClick={handleExportLedger}
          className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white"
        >
          <Image src={CONFIG.icons.CHECK || "/placeholder.svg"} alt="Export" width={16} height={16} className="mr-2" />
          Export Ledger
        </Button>
      </div>

      <Button
        onClick={() => setShowLedger(!showLedger)}
        variant="outline"
        className="w-full mt-3 text-xs"
      >
        {showLedger ? "Hide" : "Show"} Transaction Details
      </Button>

      {showLedger && (
        <div className="mt-4 p-4 bg-muted rounded-lg max-h-96 overflow-y-auto">
          <pre className="text-xs font-mono">
            {JSON.stringify(ledger.exportLedger(), null, 2)}
          </pre>
        </div>
      )}
    </Card>
  )
}
