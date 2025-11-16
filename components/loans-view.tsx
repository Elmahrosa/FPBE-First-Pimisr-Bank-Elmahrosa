"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface LoansViewProps {
  onBack: () => void
}

export function LoansView({ onBack }: LoansViewProps) {
  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold">Loans</h2>
      </div>

      <Card className="p-6 bg-gradient-to-br from-primary to-accent text-primary-foreground">
        <h3 className="text-lg font-semibold mb-2">Get a loan in Pi or TEOS</h3>
        <p className="text-sm opacity-90 mb-4">Competitive rates starting from 3.5% APR</p>
        <Button className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">Apply Now</Button>
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-4">Loan Types</h3>
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Personal Loan</h4>
              <span className="text-sm font-medium text-primary">3.5% - 8%</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Borrow up to π 50,000 for personal expenses</p>
            <ul className="text-sm text-muted-foreground space-y-1 mb-3">
              <li>• Flexible repayment terms (6-60 months)</li>
              <li>• No collateral required</li>
              <li>• Quick approval in 24 hours</li>
            </ul>
            <Button variant="outline" className="w-full bg-transparent">
              Learn More
            </Button>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Business Loan</h4>
              <span className="text-sm font-medium text-primary">4.5% - 10%</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Grow your business with up to π 500,000</p>
            <ul className="text-sm text-muted-foreground space-y-1 mb-3">
              <li>• Terms up to 10 years</li>
              <li>• Collateral may be required</li>
              <li>• Dedicated business support</li>
            </ul>
            <Button variant="outline" className="w-full bg-transparent">
              Learn More
            </Button>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Home Loan</h4>
              <span className="text-sm font-medium text-primary">3.5% - 6%</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Finance your dream home with up to π 2,000,000</p>
            <ul className="text-sm text-muted-foreground space-y-1 mb-3">
              <li>• Terms up to 30 years</li>
              <li>• Property as collateral</li>
              <li>• Special rates for TEOS holders</li>
            </ul>
            <Button variant="outline" className="w-full bg-transparent">
              Learn More
            </Button>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Active Loans</h3>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold">Personal Loan</h4>
              <p className="text-sm text-muted-foreground">Loan #PL-2024-001</p>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Active</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Loan Amount</p>
              <p className="font-semibold">π 10,000</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding</p>
              <p className="font-semibold">π 7,250</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Interest Rate</p>
              <p className="font-semibold">5.5% APR</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Next Payment</p>
              <p className="font-semibold">π 425</p>
            </div>
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Repayment Progress</span>
              <span className="font-medium">27.5%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: "27.5%" }}></div>
            </div>
          </div>
          <Button className="w-full">Make Payment</Button>
        </Card>
      </div>
    </div>
  )
}
