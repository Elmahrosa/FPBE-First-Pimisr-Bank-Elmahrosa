"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface PiWalletViewProps {
  onBack: () => void
}

export function PiWalletView({ onBack }: PiWalletViewProps) {
  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold">Pi Network Wallet</h2>
      </div>

      <Card className="p-6 bg-gradient-to-br from-[#B8860B] to-[#DAA520] text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm opacity-90 mb-1">Pi Balance</p>
            <h3 className="text-4xl font-bold">π 18,240.50</h3>
            <p className="text-sm opacity-90 mt-2">≈ $54,721.50 USD</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-4xl">π</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button className="flex-1 bg-white text-[#B8860B] hover:bg-white/90">Send Pi</Button>
          <Button className="flex-1 bg-white/20 text-white hover:bg-white/30">Receive</Button>
        </div>
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-4">Pi Network Features</h3>
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#B8860B]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#B8860B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold">Staking</h4>
                  <p className="text-sm text-muted-foreground">Earn 8.5% APY</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">π 5,000</p>
                <p className="text-sm text-muted-foreground">Staked</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#DAA520]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#DAA520]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold">Mining</h4>
                  <p className="text-sm text-muted-foreground">Active session</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600">+12.5 π/day</p>
                <p className="text-sm text-muted-foreground">Rate</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#FFD700]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold">Security Circle</h4>
                  <p className="text-sm text-muted-foreground">5 members</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Manage
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Recent Pi Transactions</h3>
        <div className="space-y-3">
          {[
            { type: "Received", amount: "+250 π", from: "John Doe", time: "2 hours ago" },
            { type: "Sent", amount: "-100 π", to: "Sarah Smith", time: "1 day ago" },
            { type: "Mining Reward", amount: "+12.5 π", from: "Pi Network", time: "2 days ago" },
          ].map((tx, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">{tx.type}</h4>
                  <p className="text-sm text-muted-foreground">{tx.from || tx.to}</p>
                  <p className="text-xs text-muted-foreground mt-1">{tx.time}</p>
                </div>
                <p className={`font-semibold ${tx.amount.startsWith("+") ? "text-green-600" : "text-red-600"}`}>
                  {tx.amount}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
