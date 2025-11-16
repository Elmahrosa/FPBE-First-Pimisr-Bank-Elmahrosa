"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/lib/auth-context"
import { DataStore, type Transaction } from "@/lib/store"

export function TransactionsList() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    if (user) {
      const userData = DataStore.getUserData(user.username)
      setTransactions(userData.transactions.slice(0, 5))
    }
  }, [user])

  const getTransactionIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "send":
        return "↗️"
      case "receive":
        return "↙️"
      case "stake":
        return "🔒"
      case "unstake":
        return "🔓"
      case "land":
        return "🌍"
      case "card":
        return "💳"
      default:
        return "💰"
    }
  }

  const getTransactionColor = (type: Transaction["type"]) => {
    if (type === "receive") return "text-green-500"
    if (type === "send" || type === "stake" || type === "land" || type === "card") return "text-foreground"
    return "text-primary"
  }

  if (transactions.length === 0) {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
        <Card className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">No transactions yet</p>
          <p className="text-xs text-muted-foreground mt-1">Your transaction history will appear here</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Transactions</h3>
        {transactions.length > 0 && <button className="text-sm text-primary font-medium">See All</button>}
      </div>

      <div className="space-y-3">
        {transactions.map((transaction) => (
          <Card key={transaction.id} className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-xl">
                {getTransactionIcon(transaction.type)}
              </div>
              <div className="flex-1">
                <p className="font-medium">{transaction.description}</p>
                <p className="text-sm text-muted-foreground">
                  {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} •{" "}
                  {transaction.date.toLocaleDateString()}
                </p>
              </div>
              <div className={`text-right ${getTransactionColor(transaction.type)}`}>
                <p className="font-semibold">
                  {transaction.type === "receive" ? "+" : "-"}
                  {transaction.currency === "PI" ? "π" : "T"} {Math.abs(transaction.amount).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">{transaction.status}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
