"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { AuthGate } from "@/components/auth-gate"
import { AccountOverview } from "@/components/account-overview"
import { TransactionsList } from "@/components/transactions-list"
import { QuickActions } from "@/components/quick-actions"
import { BottomNav } from "@/components/bottom-nav"
import { CardsView } from "@/components/cards-view"
import { TransferView } from "@/components/transfer-view"
import { ProfileView } from "@/components/profile-view"
import { LandView } from "@/components/land-view"
import { AiChatSupport } from "@/components/ai-chat-support"
import { DataStore } from "@/lib/store"
import { Bell, MessageCircle } from 'lucide-react'
import { CONFIG } from "@/lib/config"

export default function HomePage() {
  const { user, isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState<"home" | "cards" | "transfer" | "profile" | "more">("home")
  const [moreView, setMoreView] = useState<"menu" | "land">("menu")

  const handleSupport = () => {
    window.open(`https://wa.me/${CONFIG.founder.whatsapp.replace("+", "")}`, "_blank")
  }

  const handleNotifications = () => {
    alert("Notifications - No new notifications")
  }

  const userData = user ? DataStore.getUserData(user.username) : null
  const userPiContributed = userData?.landClaims.reduce((sum, claim) => sum + claim.piContributed, 0) || 0
  const userHectares = userData?.totalLandHectares || 0

  return (
    <AuthGate>
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-gradient-to-br from-[#B8860B] via-[#DAA520] to-[#FFD700] text-white px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm opacity-90 flex items-center gap-2">
                Welcome, {user?.username}
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 bg-red-500/90 px-2 py-0.5 rounded-full text-xs font-semibold">
                    ADMIN
                  </span>
                )}
              </p>
              <h1 className="text-xl font-semibold">First Pimisr Bank Elmahrosa</h1>
              <p className="text-xs opacity-80 mt-1">Official Pi Bank • Alexandria 110 Acres</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSupport}
                className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center hover:bg-[#1ebe5d] transition-colors"
                title="WhatsApp Support"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              <button
                onClick={handleNotifications}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
              >
                <Bell className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">110 Acres Alexandria • $200M Valuation</span>
              <span className="text-xs">{((userHectares / 44.52) * 100).toFixed(4)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div className="bg-white rounded-full h-2" style={{ width: `${Math.min((userHectares / 44.52) * 100, 100)}%` }} />
            </div>
            <p className="text-xs opacity-90 mt-2">
              Your contribution: <span className="font-semibold">{userPiContributed.toFixed(0)} π</span> = {userHectares.toFixed(4)} hectares
            </p>
          </div>
        </header>

        <main className="px-4">
          {activeTab === "home" && (
            <>
              <AccountOverview />
              <QuickActions
                onNavigate={(view) => {
                  if (view === "land") {
                    setActiveTab("more")
                    setMoreView("land")
                  }
                }}
              />
              <TransactionsList />
            </>
          )}
          {activeTab === "cards" && <CardsView />}
          {activeTab === "transfer" && <TransferView />}
          {activeTab === "profile" && <ProfileView />}
          {activeTab === "more" && (
            <>
              {moreView === "menu" && (
                <div className="space-y-4 py-6">
                  <h2 className="text-2xl font-bold mb-6">Services</h2>
                  <button
                    onClick={() => setMoreView("land")}
                    className="w-full bg-gradient-to-br from-[#B8860B] to-[#DAA520] text-white p-4 rounded-xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <h3 className="font-semibold text-lg">Land Acquisition</h3>
                        <p className="text-sm opacity-90">110 Acres • Alexandria, Egypt</p>
                      </div>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                </div>
              )}
              {moreView === "land" && <LandView onBack={() => setMoreView("menu")} />}
            </>
          )}
        </main>

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        
        <AiChatSupport />
      </div>
    </AuthGate>
  )
}
