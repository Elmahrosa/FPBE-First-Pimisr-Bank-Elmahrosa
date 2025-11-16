"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface SavingsViewProps {
  onBack: () => void
}

export function SavingsView({ onBack }: SavingsViewProps) {
  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold">Savings</h2>
      </div>

      <Card className="p-6 bg-gradient-to-br from-accent to-chart-2 text-white">
        <h3 className="text-lg font-semibold mb-2">High-Yield Savings</h3>
        <p className="text-sm opacity-90 mb-4">Earn up to 12% APY on your Pi & TEOS</p>
        <div className="flex gap-3">
          <Button className="bg-white text-accent hover:bg-white/90">Open Account</Button>
          <Button className="bg-white/20 text-white hover:bg-white/30">Learn More</Button>
        </div>
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-4">Your Savings Accounts</h3>
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold">Pi Savings Account</h4>
                <p className="text-sm text-muted-foreground">Account #SA-PI-001</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="text-2xl font-bold">π 5,000</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Interest Rate</p>
                <p className="text-2xl font-bold text-green-600">8.5%</p>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Interest Earned (This Month)</span>
                <span className="font-semibold text-green-600">+π 35.42</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1">Deposit</Button>
              <Button variant="outline" className="flex-1 bg-transparent">
                Withdraw
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold">TEOS Savings Account</h4>
                <p className="text-sm text-muted-foreground">Account #SA-TEOS-001</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="text-2xl font-bold">T 3,500</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Interest Rate</p>
                <p className="text-2xl font-bold text-green-600">12%</p>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Interest Earned (This Month)</span>
                <span className="font-semibold text-green-600">+T 35.00</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1">Deposit</Button>
              <Button variant="outline" className="flex-1 bg-transparent">
                Withdraw
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Savings Plans</h3>
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Fixed Deposit</h4>
              <span className="text-sm font-medium text-primary">Up to 15% APY</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Lock your Pi or TEOS for higher returns</p>
            <ul className="text-sm text-muted-foreground space-y-1 mb-3">
              <li>• Terms: 3, 6, 12, 24 months</li>
              <li>• Guaranteed returns</li>
              <li>• Early withdrawal penalties apply</li>
            </ul>
            <Button variant="outline" className="w-full bg-transparent">
              Open Fixed Deposit
            </Button>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Goal-Based Savings</h4>
              <span className="text-sm font-medium text-primary">8% - 10% APY</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Save for specific goals with automated deposits</p>
            <ul className="text-sm text-muted-foreground space-y-1 mb-3">
              <li>• Set custom savings goals</li>
              <li>• Automated monthly deposits</li>
              <li>• Track progress with insights</li>
            </ul>
            <Button variant="outline" className="w-full bg-transparent">
              Create Savings Goal
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
