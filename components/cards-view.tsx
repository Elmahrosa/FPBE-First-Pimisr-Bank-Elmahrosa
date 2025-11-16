"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { DataStore, type VirtualCard } from "@/lib/store"
import { Label } from "@/components/ui/label"

export function CardsView() {
  const { user } = useAuth()
  const [cards, setCards] = useState<VirtualCard[]>([])
  const [selectedCard, setSelectedCard] = useState<VirtualCard | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [cardType, setCardType] = useState<"standard" | "gold" | "platinum">("standard")

  useEffect(() => {
    if (user) {
      const userData = DataStore.getUserData(user.username)
      setCards(userData.cards)
      if (userData.cards.length > 0) {
        setSelectedCard(userData.cards[0])
      }
    }
  }, [user])

  const handleCreateCard = () => {
    if (!user) return
    const newCard = DataStore.createVirtualCard(user.username, cardType)
    setCards([...cards, newCard])
    setSelectedCard(newCard)
    setShowCreateDialog(false)
  }

  const handleLockCard = () => {
    if (!selectedCard || !user) return
    const userData = DataStore.getUserData(user.username)
    const cardIndex = userData.cards.findIndex((c) => c.id === selectedCard.id)
    if (cardIndex !== -1) {
      userData.cards[cardIndex].status = userData.cards[cardIndex].status === "active" ? "locked" : "active"
      DataStore.saveUserData(user.username, userData)
      setSelectedCard(userData.cards[cardIndex])
      setCards(userData.cards)
    }
  }

  const handleLoadFunds = () => {
    if (!selectedCard || !user) return
    const amount = prompt("Enter amount of Pi to load onto card:")
    if (amount && !isNaN(Number(amount))) {
      const userData = DataStore.getUserData(user.username)
      const piAmount = Number(amount)
      if (userData.piBalance >= piAmount) {
        const cardIndex = userData.cards.findIndex((c) => c.id === selectedCard.id)
        if (cardIndex !== -1) {
          userData.cards[cardIndex].balance += piAmount
          userData.piBalance -= piAmount
          DataStore.saveUserData(user.username, userData)
          DataStore.addTransaction(user.username, {
            type: "card",
            amount: piAmount,
            currency: "PI",
            description: `Loaded ${piAmount} π to card`,
            status: "completed",
          })
          setSelectedCard(userData.cards[cardIndex])
          setCards(userData.cards)
          alert(`Successfully loaded ${piAmount} π to your card!`)
        }
      } else {
        alert("Insufficient Pi balance!")
      }
    }
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">My Cards</h2>
        <Button
          onClick={() => setShowCreateDialog(true)}
          size="sm"
          className="bg-gradient-to-r from-[#B8860B] to-[#DAA520] text-white"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Card
        </Button>
      </div>

      {showCreateDialog && (
        <Card className="p-6 mb-6 border-[#B8860B]">
          <h3 className="font-semibold mb-4">Create Virtual Card</h3>
          <div className="space-y-4">
            <div>
              <Label>Card Type</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Button
                  variant={cardType === "standard" ? "default" : "outline"}
                  onClick={() => setCardType("standard")}
                  className="h-auto py-3 flex flex-col"
                >
                  <span className="font-semibold">Standard</span>
                  <span className="text-xs">Free</span>
                </Button>
                <Button
                  variant={cardType === "gold" ? "default" : "outline"}
                  onClick={() => setCardType("gold")}
                  className="h-auto py-3 flex flex-col"
                >
                  <span className="font-semibold">Gold</span>
                  <span className="text-xs">10 π</span>
                </Button>
                <Button
                  variant={cardType === "platinum" ? "default" : "outline"}
                  onClick={() => setCardType("platinum")}
                  className="h-auto py-3 flex flex-col"
                >
                  <span className="font-semibold">Platinum</span>
                  <span className="text-xs">50 π</span>
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateCard} className="flex-1 bg-[#B8860B] text-white">
                Create Card
              </Button>
              <Button onClick={() => setShowCreateDialog(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {cards.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#B8860B]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#B8860B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          </div>
          <h3 className="font-semibold mb-2">No Cards Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first virtual card to start using Pi payments
          </p>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-[#B8860B] text-white">
            Create Your First Card
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Card Display */}
          {selectedCard && (
            <div
              className={`relative h-52 rounded-3xl ${
                selectedCard.type === "platinum"
                  ? "bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900"
                  : selectedCard.type === "gold"
                    ? "bg-gradient-to-br from-[#B8860B] to-[#FFD700]"
                    : "bg-gradient-to-br from-[#DAA520] to-[#B8860B]"
              } p-6 text-white shadow-xl`}
            >
              {selectedCard.status === "locked" && (
                <div className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center backdrop-blur-sm">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="font-semibold">Card Locked</p>
                  </div>
                </div>
              )}
              <div className="flex flex-col h-full justify-between">
                <div className="flex items-center justify-between">
                  <div className="text-sm opacity-90">First Pimisr Bank</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">{selectedCard.type.toUpperCase()}</span>
                    <div className="w-10 h-8 bg-white/20 rounded flex items-center justify-center">
                      <span className="text-xl font-bold">π</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm opacity-90 mb-2">Card Number</div>
                  <div className="text-xl font-mono tracking-wider">{selectedCard.number}</div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs opacity-75 mb-1">Card Holder</div>
                    <div className="text-sm font-medium">{selectedCard.holder}</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-75 mb-1">Expires</div>
                    <div className="text-sm font-medium">{selectedCard.expiry}</div>
                  </div>
                  <div>
                    <div className="text-xs opacity-75 mb-1">CVV</div>
                    <div className="text-sm font-medium">{selectedCard.cvv}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card Balance */}
          {selectedCard && (
            <Card className="p-4 bg-gradient-to-r from-[#B8860B]/10 to-[#FFD700]/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Card Balance</p>
                  <p className="text-2xl font-bold">π {selectedCard.balance.toFixed(2)}</p>
                </div>
                <Button onClick={handleLoadFunds} size="sm" className="bg-[#B8860B] text-white">
                  Load Funds
                </Button>
              </div>
            </Card>
          )}

          {/* Card Actions */}
          {selectedCard && (
            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={handleLockCard}
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 bg-transparent border-[#B8860B] hover:bg-[#B8860B]/10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {selectedCard.status === "locked" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  )}
                </svg>
                <span className="text-xs">{selectedCard.status === "locked" ? "Unlock" : "Lock"}</span>
              </Button>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(selectedCard.number)
                  alert("Card number copied!")
                }}
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 bg-transparent border-[#B8860B] hover:bg-[#B8860B]/10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-xs">Copy</span>
              </Button>
              <Button
                onClick={() =>
                  alert(
                    `Card Details:\nType: ${selectedCard.type}\nStatus: ${selectedCard.status}\nBalance: ${selectedCard.balance} π`,
                  )
                }
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 bg-transparent border-[#B8860B] hover:bg-[#B8860B]/10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-xs">Details</span>
              </Button>
            </div>
          )}

          {/* All Cards List */}
          {cards.length > 1 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">All Cards</h3>
              <div className="space-y-2">
                {cards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
                      selectedCard?.id === card.id ? "border-[#B8860B] bg-[#B8860B]/5" : "border-transparent bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">•••• {card.number.slice(-4)}</p>
                        <p className="text-xs text-muted-foreground">
                          {card.type} • {card.status}
                        </p>
                      </div>
                      <p className="font-semibold">π {card.balance.toFixed(2)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
