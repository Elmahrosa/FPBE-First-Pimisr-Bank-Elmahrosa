"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PiSDK, ACCESS_FEE, INVITATION_CODE } from "@/lib/pi-sdk"
import { CONFIG } from "@/lib/config"

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, hasPaid, login, markAsPaid } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [petitionSigned, setPetitionSigned] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('petitionConfirmed') === 'true'
    }
    return false
  })

  const handleConfirmPetition = () => {
    localStorage.setItem('petitionConfirmed', 'true')
    setPetitionSigned(true)
  }

  if (!petitionSigned) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#B8860B] via-[#DAA520] to-[#FFD700] flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#B8860B] to-[#FFD700] flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl text-white">π</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">First Pimisr Bank Elmahrosa</h1>
            <p className="text-sm text-muted-foreground">Official Pi Network Bank • Egypt</p>
          </div>

          <div className="space-y-4">
            <div className="bg-[#B8860B]/10 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-sm mb-2 text-[#B8860B]">Step 1: Sign the Petition</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Support the movement to regulate digital currencies in Egypt before joining FPBE Bank
              </p>
              <Button
                onClick={() => window.open(CONFIG.admin.petitionUrl, "_blank")}
                className="w-full bg-white hover:bg-gray-50 text-[#B8860B] mb-2"
              >
                Sign Petition on Change.org
              </Button>
            </div>

            <Button
              onClick={handleConfirmPetition}
              className="w-full bg-gradient-to-r from-[#B8860B] to-[#DAA520] hover:from-[#DAA520] hover:to-[#FFD700] text-white"
              size="lg"
            >
              I Have Signed - Continue
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#B8860B] via-[#DAA520] to-[#FFD700] flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#B8860B] to-[#FFD700] flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl text-white">π</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">First Pimisr Bank Elmahrosa</h1>
            <p className="text-sm text-muted-foreground">Official Pi Network Bank • Egypt</p>
            <div className="mt-4 inline-flex items-center gap-2 bg-[#B8860B]/10 px-3 py-1.5 rounded-full">
              <svg className="w-4 h-4 text-[#B8860B]" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs font-medium text-[#B8860B]">Verified Only • No Forks</span>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              onClick={async () => {
                setIsLoading(true)
                setError("")
                try {
                  await login()
                } catch (err) {
                  setError("Failed to authenticate with Pi Network")
                } finally {
                  setIsLoading(false)
                }
              }}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#B8860B] to-[#DAA520] hover:from-[#DAA520] hover:to-[#FFD700] text-white"
              size="lg"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connecting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xl">π</span>
                  Sign in with Pi Network
                </div>
              )}
            </Button>

            {error && <p className="text-sm text-destructive text-center">{error}</p>}

            <p className="text-xs text-center text-muted-foreground mt-4">
              New to Pi Network?{" "}
              <span className="text-[#B8860B] font-medium">Use invitation code: {INVITATION_CODE}</span>
            </p>
          </div>
        </Card>
      </div>
    )
  }

  if (!hasPaid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#B8860B] via-[#DAA520] to-[#FFD700] flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#B8860B] to-[#FFD700] flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl text-white">π</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome, {user?.username}!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              To access FPBE Bank and contribute to Egypt's land acquisition, a one-time payment is required.
            </p>

            <div className="bg-[#B8860B]/10 rounded-lg p-6 mb-6">
              <p className="text-sm text-muted-foreground mb-2">One-time Access Fee</p>
              <p className="text-4xl font-bold text-[#B8860B] mb-2">π {ACCESS_FEE}</p>
              <p className="text-xs text-muted-foreground">
                Your Pi contributes to verified land acquisition for Egypt's Smart City
              </p>
            </div>

            <div className="bg-card border-2 border-[#B8860B]/20 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-sm mb-3 text-[#B8860B]">What You Get:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-[#B8860B] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Full access to FPBE banking services</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-[#B8860B] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Verified contributor status & badge system</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-[#B8860B] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Land acquisition tracking & claims</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-[#B8860B] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>TEOS token ecosystem access</span>
                </li>
              </ul>
            </div>

            {error && <p className="text-sm text-destructive mb-4">{error}</p>}

            <Button
              onClick={async () => {
                setIsLoading(true)
                setError("")
                try {
                  await PiSDK.createPayment({
                    identifier: `fpbe-access-${user?.uid}`,
                    amount: ACCESS_FEE,
                    memo: "FPBE Bank Access Fee - Land Contribution",
                    metadata: { userId: user?.uid, type: "access_fee" },
                  })
                  markAsPaid()
                } catch (err) {
                  setError("Payment failed. Please try again.")
                } finally {
                  setIsLoading(false)
                }
              }}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#B8860B] to-[#DAA520] hover:from-[#DAA520] hover:to-[#FFD700] text-white"
              size="lg"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing Payment...
                </div>
              ) : (
                `Pay π ${ACCESS_FEE} & Enter`
              )}
            </Button>

            <p className="text-xs text-muted-foreground mt-4">Every Pi is sacred • Mapped to Egypt's future</p>
          </div>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
