"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { getLivePrices } from "@/lib/token-prices"
import { piSdk } from "@/lib/pi-sdk"
import { connectPhantom, getAllSplBalances, TREASURY_WALLET, SOLANA_MINTS, getMintBalance } from "@/lib/phantom-wallet"
import { CONFIG } from "@/lib/config"
import Image from "next/image"
import { PiWalletDetails } from "./pi-wallet-details"
import { AdminPanel } from "./admin-panel"

const tokenIcons = {
  PI: "/assets/icons/pi.svg",
  ERT: "/assets/icons/ert.svg",
  TUT: "/assets/icons/tut.svg",
  USD: "/assets/icons/usd.svg",
  USDT: "/assets/icons/usdt.svg",
  TEOS: "/assets/icons/teos.svg",
  FOUNDER: "/assets/icons/founder.svg"
}

export function AccountOverview() {
  const { user, isAdmin } = useAuth()
  const [piBalance, setPiBalance] = useState<number | null>(null)
  const [lockedPi, setLockedPi] = useState<number | null>(null)
  const [prices, setPrices] = useState<any>({})
  const [phantomAddress, setPhantomAddress] = useState<string | null>(null)
  const [phantomBalances, setPhantomBalances] = useState<{ ERT: number; TEOS: number; TUT: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [allSplTokens, setAllSplTokens] = useState<any[]>([])

  useEffect(() => {
    async function fetchPrices() {
      const live = await getLivePrices()
      setPrices(live)
    }
    fetchPrices()
    const interval = setInterval(fetchPrices, 300000) // 5 minutes
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!user?.wallet) return

    async function fetchRealPiData() {
      setLoading(true)
      try {
        const realBalance = await piSdk.getBalance(user.wallet!)
        const realLocked = await piSdk.getLockedAmount(user.wallet!)
        
        setPiBalance(realBalance)
        setLockedPi(realLocked)
      } catch (error) {
        console.error("Error fetching Pi data:", error)
        setPiBalance(0)
        setLockedPi(0)
      } finally {
        setLoading(false)
      }
    }

    fetchRealPiData()
    const interval = setInterval(fetchRealPiData, 300000)
    return () => clearInterval(interval)
  }, [user])

  async function handleConnectPhantom() {
    const addr = await connectPhantom()
    setPhantomAddress(addr)
    if (addr) {
      try {
        const ertBal = await getMintBalance(addr, SOLANA_MINTS.ERT)
        const teosBal = await getMintBalance(addr, SOLANA_MINTS.TEOS)
        const tutBal = await getMintBalance(addr, SOLANA_MINTS.TUT)
        
        setPhantomBalances({
          ERT: ertBal?.uiAmount || 0,
          TEOS: teosBal?.uiAmount || 0,
          TUT: tutBal?.uiAmount || 0
        })

        const allTokens = await getAllSplBalances(addr)
        setAllSplTokens(allTokens)
      } catch (error) {
        console.error("Error fetching Phantom balances:", error)
      }
    }
  }

  const handleSwap = (fromToken: string, toToken: string) => {
    alert(`Swap ${fromToken} ↔ ${toToken} - Feature coming soon!`)
  }

  const handleCardPayment = () => {
    alert("Card Payment - Feature coming soon!")
  }

  const hasPiBalance = piBalance !== null

  return (
    <>
      {isAdmin && <AdminPanel phantomAddress={phantomAddress} />}
      
      <Card className="p-6 -mt-8 mb-6 bg-card shadow-lg">
        {isAdmin && (
          <div className="mb-4 p-3 bg-gradient-to-r from-[#B8860B]/10 to-amber-100/10 dark:to-amber-950/10 rounded-lg border border-[#B8860B]/20">
            <div className="flex items-center gap-3 mb-3">
              <Image 
                src={CONFIG.icons.FOUNDER || "/placeholder.svg"} 
                alt="Founder Icon" 
                width={32} 
                height={32}
                className="rounded-full"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#B8860B]">{CONFIG.founder.label}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {user?.wallet || CONFIG.founder.address}
                </p>
              </div>
              <div className="px-2 py-1 bg-[#B8860B]/20 rounded text-xs font-semibold text-[#B8860B] flex items-center gap-1">
                <span>{CONFIG.founder.verified_badge}</span>
                Verified Admin
              </div>
            </div>
            
            <a
              href={`https://wa.me/${CONFIG.founder.whatsapp.replace("+", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Image src={CONFIG.icons.WHATSAPP || "/placeholder.svg"} alt="WhatsApp" width={20} height={20} />
              Contact Founder via WhatsApp
            </a>
          </div>
        )}

        {loading ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 border-4 border-[#B8860B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Fetching real Pi balance from network...</p>
          </div>
        ) : piBalance !== null ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pi Network Balance</p>
                <h2 className="text-3xl font-bold">π {piBalance.toFixed(2)}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  ≈ ${(piBalance * (prices.PI_USD || 0)).toFixed(2)} USD
                  {prices.PI_USD && (
                    <span className="ml-2 text-green-500">
                      @ ${prices.PI_USD.toFixed(4)}/Pi
                    </span>
                  )}
                </p>
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  <span>{CONFIG.founder.verified_badge}</span>
                  Live balance from Pi Network
                </p>
                {lockedPi !== null && lockedPi > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Locked/Staked: π {lockedPi.toFixed(2)}
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-full bg-[#B8860B]/10 flex items-center justify-center">
                <Image src={CONFIG.icons.PI || "/placeholder.svg"} alt="Pi" width={32} height={32} />
              </div>
            </div>

            <PiWalletDetails username={user?.username || ""} prices={prices} />
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-destructive">Unable to fetch Pi balance. Please try reconnecting.</p>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold mb-3">Solana Wallet (Phantom)</h3>
          {!phantomAddress ? (
            <Button
              onClick={handleConnectPhantom}
              className="w-full bg-gradient-to-r from-[#534BB1] to-[#AB9FF2] text-white hover:opacity-90"
            >
              <Image src={CONFIG.icons.PHANTOM || "/placeholder.svg"} alt="Phantom" width={20} height={20} className="mr-2" />
              Connect Phantom Wallet
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Solana Address</p>
                <p className="text-xs font-mono">{phantomAddress.substring(0, 8)}...{phantomAddress.substring(phantomAddress.length - 8)}</p>
              </div>
              
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Treasury/Mint Wallet</p>
                <p className="text-xs font-mono text-amber-600 dark:text-amber-500">{TREASURY_WALLET}</p>
              </div>
              
              {phantomBalances && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
                    <Image src={CONFIG.icons.ERT || "/placeholder.svg"} alt="ERT" width={24} height={24} className="mb-2" />
                    <p className="text-xs text-muted-foreground mb-1">ERT</p>
                    <p className="text-lg font-bold">{phantomBalances.ERT.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      ≈ ${(phantomBalances.ERT * (prices.ERT_USD || 0)).toFixed(2)} USD
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">Real Solana balance</p>
                  </div>
                  
                  <div className="p-3 rounded-lg border bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
                    <Image src={CONFIG.icons.TUT || "/placeholder.svg"} alt="TUT" width={24} height={24} className="mb-2" />
                    <p className="text-xs text-muted-foreground mb-1">TUT</p>
                    <p className="text-lg font-bold">{phantomBalances.TUT.toFixed(2)}</p>
                    {prices.TUT_USD && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ≈ ${(phantomBalances.TUT * prices.TUT_USD).toFixed(2)} USD
                      </p>
                    )}
                    <p className="text-xs text-emerald-600 mt-1">Real Solana balance</p>
                  </div>
                  
                  <div className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-900/20 opacity-70">
                    <Image src={CONFIG.icons.TEOS || "/placeholder.svg"} alt="TEOS" width={24} height={24} className="mb-2" />
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-muted-foreground">TEOS</p>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-800 rounded text-gray-600">Legacy</span>
                    </div>
                    <p className="text-lg font-bold">{phantomBalances.TEOS.toFixed(2)}</p>
                    {prices.TEOS_USD && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ≈ ${(phantomBalances.TEOS * prices.TEOS_USD).toFixed(2)} USD
                      </p>
                    )}
                    <p className="text-xs text-emerald-600 mt-1">Real Solana balance</p>
                  </div>
                </div>
              )}

              {allSplTokens.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                  <p className="text-xs font-semibold mb-2">All SPL Tokens Detected</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {allSplTokens.map((token, idx) => (
                      <div key={idx} className="text-xs font-mono flex justify-between">
                        <span className="text-muted-foreground">{token.symbol || "Unknown"}</span>
                        <span className="font-semibold">{token.uiAmount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </>
  )
}
