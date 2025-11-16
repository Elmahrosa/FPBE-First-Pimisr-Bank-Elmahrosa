"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { PiSDK, type PiUser, ADMIN_USERNAME, ADMIN_WALLET } from "./pi-sdk"

interface AuthContextType {
  user: PiUser | null
  isAdmin: boolean
  isAuthenticated: boolean
  hasPaid: boolean
  login: (username?: string, wallet?: string) => Promise<void>
  logout: () => void
  markAsPaid: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PiUser | null>(null)
  const [hasPaid, setHasPaid] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored session
    const storedUser = localStorage.getItem("fpbe_user")
    const storedPaid = localStorage.getItem("fpbe_paid")

    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    if (storedPaid === "true") {
      setHasPaid(true)
    }
    setIsLoading(false)
  }, [])

  const login = async (username?: string, wallet?: string) => {
    try {
      let piUser: PiUser

      if (username && wallet) {
        // Manual login with username and wallet
        piUser = {
          uid: username,
          username: username,
          wallet: wallet,
        }
      } else {
        // Pi SDK authentication
        piUser = await PiSDK.authenticate()
      }

      setUser(piUser)
      localStorage.setItem("fpbe_user", JSON.stringify(piUser))

      // Admin auto-pays
      if (piUser.username === ADMIN_USERNAME || piUser.wallet === ADMIN_WALLET) {
        setHasPaid(true)
        localStorage.setItem("fpbe_paid", "true")
      }
    } catch (error) {
      console.error("[v0] Login error:", error)
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    setHasPaid(false)
    localStorage.removeItem("fpbe_user")
    localStorage.removeItem("fpbe_paid")
  }

  const markAsPaid = () => {
    setHasPaid(true)
    localStorage.setItem("fpbe_paid", "true")
  }

  const isAdmin = user?.username === ADMIN_USERNAME || user?.wallet === ADMIN_WALLET
  const isAuthenticated = !!user

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#B8860B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading FPBE Bank...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, isAuthenticated, hasPaid, login, logout, markAsPaid }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
