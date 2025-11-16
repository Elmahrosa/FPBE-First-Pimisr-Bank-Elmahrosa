"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getPiWalletData, PiWalletData } from "@/lib/pi-sdk"
import { CONFIG } from "@/lib/config"
import Image from "next/image"

interface PiWalletDetailsProps {
  username: string
  prices: any
}

export function PiWalletDetails({ username, prices }: PiWalletDetailsProps) {
  const [walletData, setWalletData] = useState<PiWalletData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchWalletData() {
      try {
        const data = await getPiWalletData(username)
        setWalletData(data)
      } catch (error) {
        console.error("[v0] Error loading wallet data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchWalletData()
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchWalletData, 300000)
    return () => clearInterval(interval)
  }, [username])

  if (loading) {
    return (
      <Card className="p-6 bg-card shadow-lg">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-[#B8860B] border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    )
  }

  if (!walletData) return null

  return (
    <Card className="p-6 bg-card shadow-lg">
      <div className="space-y-6">
        {/* Pi Balance */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Pi Balance</p>
            <h2 className="text-4xl font-bold">π {walletData.balance.toLocaleString()}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              ≈ ${(walletData.balance * (prices.PI_USD || 0)).toLocaleString()} USD
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-[#B8860B] hover:bg-[#9A7209]">
              <Image src="/assets/icons/pi.svg" alt="Send" width={16} height={16} className="mr-2" />
              Send Pi
            </Button>
            <Button size="sm" variant="outline">
              Receive
            </Button>
          </div>
        </div>

        {/* Pi Network Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Staking */}
          <div className="p-4 rounded-lg border bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-orange-700 dark:text-orange-400">Staking</h3>
              <span className="text-xs px-2 py-1 bg-orange-200 dark:bg-orange-900 rounded text-orange-700 dark:text-orange-300">
                {walletData.staking.apy}% APY
              </span>
            </div>
            <p className="text-2xl font-bold mb-1">π {walletData.staking.amount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Staked</p>
            <Button size="sm" className="w-full mt-3 bg-orange-600 hover:bg-orange-700">
              Earn 8.5% APY
            </Button>
          </div>

          {/* Mining */}
          <div className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-700 dark:text-blue-400">Mining</h3>
              <span className={`text-xs px-2 py-1 rounded ${
                walletData.mining.active 
                  ? "bg-green-200 dark:bg-green-900 text-green-700 dark:text-green-300" 
                  : "bg-gray-200 dark:bg-gray-800 text-gray-600"
              }`}>
                {walletData.mining.active ? "Active session" : "Inactive"}
              </span>
            </div>
            <p className="text-2xl font-bold mb-1">+{walletData.mining.rate} π/day</p>
            <p className="text-xs text-muted-foreground">Rate</p>
            <Button size="sm" className="w-full mt-3 bg-blue-600 hover:bg-blue-700">
              {walletData.mining.active ? "Mining..." : "Start Mining"}
            </Button>
          </div>

          {/* Security Circle */}
          <div className="p-4 rounded-lg border bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-purple-700 dark:text-purple-400">Security Circle</h3>
            </div>
            <p className="text-2xl font-bold mb-1">{walletData.securityCircle.members} members</p>
            <p className="text-xs text-muted-foreground">Circle size</p>
            <Button size="sm" className="w-full mt-3 bg-purple-600 hover:bg-purple-700">
              Manage
            </Button>
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <h3 className="font-semibold mb-4">Recent Pi Transactions</h3>
          <div className="space-y-3">
            {walletData.transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
            ) : (
              walletData.transactions.slice(0, 5).map((tx, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === "received" ? "bg-green-100 dark:bg-green-950" :
                      tx.type === "sent" ? "bg-red-100 dark:bg-red-950" :
                      "bg-blue-100 dark:bg-blue-950"
                    }`}>
                      <span className="text-lg">
                        {tx.type === "received" ? "↓" : tx.type === "sent" ? "↑" : "⛏"}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm capitalize">{tx.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.from || tx.to || "Pi Network"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      tx.type === "received" ? "text-green-600" : 
                      tx.type === "sent" ? "text-red-600" : 
                      "text-blue-600"
                    }`}>
                      {tx.type === "sent" ? "-" : "+"}{tx.amount} π
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
