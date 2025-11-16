"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface InvestmentsViewProps {
  onBack: () => void
}

export function InvestmentsView({ onBack }: InvestmentsViewProps) {
  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold">Investments</h2>
      </div>

      <Card className="p-6 bg-gradient-to-br from-chart-2 to-chart-4 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm opacity-90 mb-1">Total Portfolio Value</p>
            <h3 className="text-3xl font-bold">π 12,450</h3>
            <p className="text-sm opacity-90 mt-1">≈ $37,350 USD</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">Total Gain</p>
            <p className="text-2xl font-bold text-green-300">+18.5%</p>
          </div>
        </div>
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-4">Investment Products</h3>
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#B8860B]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#B8860B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold">Pi Growth Fund</h4>
                  <p className="text-sm text-muted-foreground">Diversified Pi ecosystem</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600">+22.5%</p>
                <p className="text-xs text-muted-foreground">1Y Return</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-muted rounded p-2">
                <p className="text-xs text-muted-foreground">Your Investment</p>
                <p className="font-semibold text-sm">π 5,000</p>
              </div>
              <div className="bg-muted rounded p-2">
                <p className="text-xs text-muted-foreground">Current Value</p>
                <p className="font-semibold text-sm">π 6,125</p>
              </div>
              <div className="bg-muted rounded p-2">
                <p className="text-xs text-muted-foreground">Risk</p>
                <p className="font-semibold text-sm text-yellow-600">Medium</p>
              </div>
            </div>
            <Button variant="outline" className="w-full bg-transparent">
              View Details
            </Button>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
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
                <div>
                  <h4 className="font-semibold">TEOS Staking Pool</h4>
                  <p className="text-sm text-muted-foreground">Earn passive income</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600">12% APY</p>
                <p className="text-xs text-muted-foreground">Fixed Rate</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-muted rounded p-2">
                <p className="text-xs text-muted-foreground">Staked</p>
                <p className="font-semibold text-sm">T 2,500</p>
              </div>
              <div className="bg-muted rounded p-2">
                <p className="text-xs text-muted-foreground">Earned</p>
                <p className="font-semibold text-sm">T 125</p>
              </div>
              <div className="bg-muted rounded p-2">
                <p className="text-xs text-muted-foreground">Risk</p>
                <p className="font-semibold text-sm text-green-600">Low</p>
              </div>
            </div>
            <Button variant="outline" className="w-full bg-transparent">
              Manage Stake
            </Button>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFD700]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#FFD700]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold">Real Estate Fund</h4>
                  <p className="text-sm text-muted-foreground">Property investments</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600">+15.8%</p>
                <p className="text-xs text-muted-foreground">1Y Return</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-muted rounded p-2">
                <p className="text-xs text-muted-foreground">Your Investment</p>
                <p className="font-semibold text-sm">π 4,000</p>
              </div>
              <div className="bg-muted rounded p-2">
                <p className="text-xs text-muted-foreground">Current Value</p>
                <p className="font-semibold text-sm">π 4,632</p>
              </div>
              <div className="bg-muted rounded p-2">
                <p className="text-xs text-muted-foreground">Risk</p>
                <p className="font-semibold text-sm text-yellow-600">Medium</p>
              </div>
            </div>
            <Button variant="outline" className="w-full bg-transparent">
              View Details
            </Button>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Explore More</h3>
        <div className="space-y-3">
          <Card className="p-4 hover:bg-accent/5 cursor-pointer transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Crypto Index Fund</h4>
                <p className="text-sm text-muted-foreground">Diversified crypto portfolio</p>
                <p className="text-sm font-medium text-green-600 mt-1">Expected: 20-30% APY</p>
              </div>
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Card>

          <Card className="p-4 hover:bg-accent/5 cursor-pointer transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Green Energy Fund</h4>
                <p className="text-sm text-muted-foreground">Sustainable investments</p>
                <p className="text-sm font-medium text-green-600 mt-1">Expected: 12-18% APY</p>
              </div>
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
