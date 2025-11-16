"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

interface ContributorViewProps {
  onBack: () => void
}

export function ContributorView({ onBack }: ContributorViewProps) {
  const [petitionText, setPetitionText] = useState("")

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <h2 className="text-2xl font-bold">Verified Contributor</h2>
      </div>

      {/* Verification Status */}
      <Card className="p-6 bg-gradient-to-br from-[#B8860B]/10 to-[#FFD700]/10 border-[#B8860B]/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#B8860B] to-[#FFD700] flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#B8860B]">Verified Contributor</h3>
              <p className="text-sm text-muted-foreground">Member since Jan 2025</p>
            </div>
          </div>
          <Badge className="bg-[#B8860B] text-white">Active</Badge>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#B8860B]">1,247</p>
            <p className="text-xs text-muted-foreground">Pi Contributed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#DAA520]">0.42</p>
            <p className="text-xs text-muted-foreground">Hectares Claimed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#FFD700]">7</p>
            <p className="text-xs text-muted-foreground">Badges Earned</p>
          </div>
        </div>
      </Card>

      {/* Contributor Map */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-[#B8860B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          Your Position on Contributor Map
        </h3>
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Region:</span>
            <span className="font-semibold">MENA - Egypt</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Rank:</span>
            <span className="font-semibold text-[#B8860B]">#127 of 3,842</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Tier:</span>
            <Badge className="bg-[#FFD700] text-black">Gold Contributor</Badge>
          </div>
        </div>
      </Card>

      {/* Civic Petition */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-[#B8860B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Submit Civic Petition
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Submit your civic petition to join the verified contributor map. Every petition is reviewed and anchored to
          Egypt's future.
        </p>
        <textarea
          value={petitionText}
          onChange={(e) => setPetitionText(e.target.value)}
          placeholder="Describe your contribution to the ElMahrosa Smart City project..."
          className="w-full min-h-32 p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
        />
        <Button className="w-full mt-4 bg-gradient-to-r from-[#B8860B] to-[#DAA520] text-white">Submit Petition</Button>
      </Card>

      {/* Verification Requirements */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Verification Requirements</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm">Minimum 100 Pi staked</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm">Civic petition approved</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-sm">Badge logic verified</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs">4</span>
            </div>
            <span className="text-sm text-muted-foreground">Active for 30 days (23 days remaining)</span>
          </div>
        </div>
      </Card>

      {/* No Forks Warning */}
      <Card className="p-6 bg-destructive/10 border-destructive/20">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-destructive mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h4 className="font-semibold text-destructive mb-1">Verified Only - No Forks</h4>
            <p className="text-sm text-muted-foreground">
              Only verified contributors with badge logic and civic petitions can fund and claim land. Every Pi is
              sacred and mapped to Egypt's future. No dilution allowed.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
