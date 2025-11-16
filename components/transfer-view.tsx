"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function TransferView() {
  const [amount, setAmount] = useState("")

  const recentContacts = [
    { id: 1, name: "Sarah Ahmed", avatar: "👩" },
    { id: 2, name: "Mohamed Ali", avatar: "👨" },
    { id: 3, name: "Fatima Hassan", avatar: "👩" },
    { id: 4, name: "Omar Khaled", avatar: "👨" },
  ]

  return (
    <div className="py-6">
      <h2 className="text-2xl font-bold mb-6">Transfer Money</h2>

      {/* Amount Input */}
      <Card className="p-6 mb-6">
        <label className="text-sm text-muted-foreground mb-2 block">Amount</label>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-3xl font-bold">$</span>
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-3xl font-bold border-0 p-0 h-auto focus-visible:ring-0"
          />
        </div>
        <p className="text-sm text-muted-foreground">Available balance: $24,582.50</p>
      </Card>

      {/* Recent Contacts */}
      <div className="mb-6">
        <h3 className="font-semibold mb-4">Recent Contacts</h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {recentContacts.map((contact) => (
            <button key={contact.id} className="flex flex-col items-center gap-2 min-w-[70px]">
              <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-2xl">
                {contact.avatar}
              </div>
              <span className="text-xs text-center text-muted-foreground leading-tight">
                {contact.name.split(" ")[0]}
              </span>
            </button>
          ))}
          <button className="flex flex-col items-center gap-2 min-w-[70px]">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl">
              +
            </div>
            <span className="text-xs text-center text-muted-foreground">Add New</span>
          </button>
        </div>
      </div>

      {/* Transfer Options */}
      <div className="space-y-3 mb-6">
        <Card className="p-4">
          <button className="flex items-center gap-4 w-full">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl">
              🏦
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">Bank Transfer</p>
              <p className="text-sm text-muted-foreground">Transfer to any bank account</p>
            </div>
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </Card>

        <Card className="p-4">
          <button className="flex items-center gap-4 w-full">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent text-xl">
              📱
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">Mobile Transfer</p>
              <p className="text-sm text-muted-foreground">Send to mobile number</p>
            </div>
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </Card>
      </div>

      <Button className="w-full h-12 text-base" size="lg">
        Continue
      </Button>
    </div>
  )
}
