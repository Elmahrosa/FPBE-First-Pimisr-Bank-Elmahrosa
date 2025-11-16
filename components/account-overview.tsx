"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { getLivePrices } from "@/lib/token-prices"
import { piSdk } from "@/lib/pi-sdk"
import { connectPhantom, getMintBalance, TREASURY_WALLET, SOLANA_MINTS } from "@/lib/phantom-wallet"
import { CONFIG } from "@/lib/config"

export function AccountOverview() {
  const { user, isAdmin } = useAuth()
  const [piBalance, setPiBalance] = useState<number | null>(null)
  const [prices, setPrices] = useState<any>({})
  const [phantomAddress, setPhantomAddress] = useState<string | null>(null)
  const [phantomBalances, setPhantomBalances] = useState<{ ERT: number; TEOS: number; TUT: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPrices() {
      const live = await getLivePrices()
      setPrices(live)
    }
    fetchPrices()
    const interval = setInterval(fetchPrices, 300000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!user?.wallet) {
      setLoading(false)
      return
    }

    async function fetchRealPiData() {
      setLoading(true)
      try {
        console.log("[v0] Fetching real Pi balance for:", user.wallet)
        const realBalance = await piSdk.getBalance(user.wallet!)
        console.log("[v0] Real Pi balance:", realBalance)
        setPiBalance(realBalance)
      } catch (error) {
        console.error("[v0] Error fetching Pi data:", error)
        setPiBalance(null)
      } finally {
        setLoading(false)
      }
    }

    fetchRealPiData()
    const interval = setInterval(fetchRealPiData, 300000)
    return () => clearInterval(interval)
  }, [user])

  async function handleConnectPhantom() {
    try {
      console.log("[v0] Connecting to Phantom wallet...")
      const addr = await connectPhantom()
      console.log("[v0] Connected to Phantom:", addr)
      setPhantomAddress(addr)
      
      if (addr) {
        const ertBal = await getMintBalance(addr, SOLANA_MINTS.ERT)
        const teosBal = await getMintBalance(addr, SOLANA_MINTS.TEOS)
        const tutBal = await getMintBalance(addr, SOLANA_MINTS.TUT)
        
        console.log("[v0] Real balances - ERT:", ertBal?.uiAmount, "TEOS:", teosBal?.uiAmount, "TUT:", tutBal?.uiAmount)
        
        setPhantomBalances({
          ERT: ertBal?.uiAmount || 0,
          TEOS: teosBal?.uiAmount || 0,
          TUT: tutBal?.uiAmount || 0
        })
      }
    } catch (error) {
      console.error("[v0] Error connecting Phantom:", error)
      alert("Failed to connect Phantom wallet. Please try again.")
    }
  }

  return (
    <Card className="p-4 sm:p-6 -mt-8 mb-6 bg-card shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 opacity-5">
        <svg viewBox="0 0 100 100" className="text-[#B8860B]">
          <polygon points="50,10 90,90 10,90" fill="currentColor" />
        </svg>
      </div>
      
      {isAdmin && (
        <div className="mb-4 p-3 bg-gradient-to-r from-[#B8860B]/10 to-amber-100/10 dark:to-amber-950/10 rounded-lg border border-[#B8860B]/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#B8860B] to-[#DAA520] flex items-center justify-center text-white font-bold text-sm shadow-md">
              F
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#B8860B]">Founder • Ayman Seif</p>
              <p className="text-xs text-muted-foreground font-mono truncate">
                {user?.wallet ? `${user.wallet.substring(0, 12)}...${user.wallet.substring(user.wallet.length - 8)}` : CONFIG.founder.address}
              </p>
            </div>
            <span className="px-2 py-1 bg-[#B8860B]/20 rounded text-xs font-semibold text-[#B8860B]">
              ADMIN
            </span>
          </div>
          
          <a
            href={`https://wa.me/${CONFIG.founder.whatsapp.replace("+", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Contact Founder on WhatsApp
          </a>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 border-4 border-[#B8860B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Fetching real Pi balance from blockchain...</p>
        </div>
      ) : piBalance !== null ? (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">Pi Network Balance</p>
          <h2 className="text-4xl sm:text-5xl font-bold mb-2 text-[#B8860B]">π {piBalance.toFixed(2)}</h2>
          {prices.PI_USD && (
            <p className="text-sm text-muted-foreground">
              ≈ ${(piBalance * prices.PI_USD).toFixed(2)} USD
              <span className="ml-2 text-green-500 font-semibold">@ ${prices.PI_USD.toFixed(4)}/Pi</span>
            </p>
          )}
          <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Live balance from Pi Network
          </p>
        </div>
      ) : (
        <div className="text-center py-6 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">Unable to fetch Pi balance. Please open in Pi Browser.</p>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-border">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="w-5 h-5 bg-gradient-to-br from-[#534BB1] to-[#AB9FF2] rounded-full" />
          Solana Blockchain (Phantom Wallet)
        </h3>
        
        {!phantomAddress ? (
          <Button
            onClick={handleConnectPhantom}
            className="w-full bg-gradient-to-r from-[#534BB1] to-[#AB9FF2] text-white hover:opacity-90 py-6 text-base font-semibold"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 128 128" fill="currentColor">
              <path d="M112.098 48.606c-1.678-2.185-4.271-3.453-7.101-3.453H24.993C20.296 45.153 16 49.448 16 54.146v19.708c0 4.698 4.296 8.993 8.993 8.993h80.004c2.83 0 5.423-1.268 7.101-3.453 1.678-2.185 2.346-5.033 1.829-7.798L112.098 48.606z"/>
            </svg>
            Connect Phantom Wallet
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Your Solana Address</p>
              <p className="text-xs font-mono break-all">
                {phantomAddress.substring(0, 8)}...{phantomAddress.substring(phantomAddress.length - 6)}
              </p>
            </div>
            
            <div className="p-3 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 rounded-lg border-2 border-[#B8860B]/30">
              <p className="text-xs font-semibold text-[#B8860B] mb-1 flex items-center gap-1">
                <span className="w-2 h-2 bg-[#B8860B] rounded-full" />
                Treasury Wallet (Official)
              </p>
              <p className="text-xs font-mono text-[#B8860B] break-all">{TREASURY_WALLET.substring(0, 12)}...{TREASURY_WALLET.substring(TREASURY_WALLET.length - 8)}</p>
            </div>
            
            {phantomBalances && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div className="p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950/20">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 mb-2 flex items-center justify-center text-white font-bold">
                    E
                  </div>
                  <p className="text-xs text-muted-foreground mb-1 font-semibold">ERT Token</p>
                  <p className="text-2xl font-bold text-blue-600">{phantomBalances.ERT.toFixed(2)}</p>
                  {prices.ERT_USD && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ≈ ${(phantomBalances.ERT * prices.ERT_USD).toFixed(2)} USD
                    </p>
                  )}
                  <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Real balance
                  </p>
                </div>
                
                <div className="p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-white to-purple-50 dark:from-gray-900 dark:to-purple-950/20">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 mb-2 flex items-center justify-center text-white font-bold">
                    T
                  </div>
                  <p className="text-xs text-muted-foreground mb-1 font-semibold">TUT Token</p>
                  <p className="text-2xl font-bold text-purple-600">{phantomBalances.TUT.toFixed(2)}</p>
                  {prices.TUT_USD && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ≈ ${(phantomBalances.TUT * prices.TUT_USD).toFixed(2)} USD
                    </p>
                  )}
                  <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Real balance
                  </p>
                </div>
                
                <div className="p-4 rounded-lg border-2 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 opacity-60">
                  <div className="w-8 h-8 rounded-full bg-gray-400 mb-2 flex items-center justify-center text-white font-bold">
                    T
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    <p className="text-xs text-muted-foreground font-semibold">TEOS Token</p>
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-300 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400 font-semibold">Legacy</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-500">{phantomBalances.TEOS.toFixed(2)}</p>
                  {prices.TEOS_USD && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ≈ ${(phantomBalances.TEOS * prices.TEOS_USD).toFixed(2)} USD
                    </p>
                  )}
                  <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Real balance
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
