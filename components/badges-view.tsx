"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface BadgesViewProps {
  onBack: () => void
}

export function BadgesView({ onBack }: BadgesViewProps) {
  const earnedBadges = [
    {
      name: "Pioneer Contributor",
      description: "First 1,000 verified contributors",
      icon: "🏆",
      rarity: "Legendary",
      earned: true,
      date: "Jan 15, 2025",
    },
    {
      name: "Land Founder",
      description: "Contributed to first 100 hectares",
      icon: "🌍",
      rarity: "Epic",
      earned: true,
      date: "Jan 20, 2025",
    },
    {
      name: "Pi Staker",
      description: "Staked 1,000+ Pi tokens",
      icon: "π",
      rarity: "Rare",
      earned: true,
      date: "Jan 22, 2025",
    },
    {
      name: "TEOS Holder",
      description: "Hold 500+ TEOS tokens",
      icon: "💎",
      rarity: "Rare",
      earned: true,
      date: "Jan 25, 2025",
    },
    {
      name: "Civic Leader",
      description: "Petition approved with honors",
      icon: "⭐",
      rarity: "Epic",
      earned: true,
      date: "Jan 28, 2025",
    },
    {
      name: "Smart City Builder",
      description: "Active in ElMahrosa development",
      icon: "🏗️",
      rarity: "Rare",
      earned: true,
      date: "Feb 1, 2025",
    },
    {
      name: "Community Champion",
      description: "Referred 10+ verified contributors",
      icon: "🤝",
      rarity: "Rare",
      earned: true,
      date: "Feb 5, 2025",
    },
  ]

  const availableBadges = [
    {
      name: "Land Baron",
      description: "Claim 1+ hectare of land",
      icon: "👑",
      rarity: "Legendary",
      requirement: "0.42 / 1.0 hectares",
      progress: 42,
    },
    {
      name: "MENA Leader",
      description: "Top 50 contributor in MENA region",
      icon: "🌟",
      rarity: "Epic",
      requirement: "Rank #127 / Top 50",
      progress: 0,
    },
    {
      name: "Pi Whale",
      description: "Stake 10,000+ Pi tokens",
      icon: "🐋",
      rarity: "Legendary",
      requirement: "1,247 / 10,000 Pi",
      progress: 12,
    },
  ]

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "Legendary":
        return "bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black"
      case "Epic":
        return "bg-gradient-to-r from-[#9333EA] to-[#C026D3] text-white"
      case "Rare":
        return "bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] text-white"
      default:
        return "bg-muted text-foreground"
    }
  }

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <h2 className="text-2xl font-bold">Badge System</h2>
      </div>

      {/* Stats Overview */}
      <Card className="p-6 bg-gradient-to-br from-[#B8860B]/10 to-[#FFD700]/10 border-[#B8860B]/20">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-[#B8860B]">7</p>
            <p className="text-xs text-muted-foreground">Badges Earned</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-[#DAA520]">3</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-[#FFD700]">15</p>
            <p className="text-xs text-muted-foreground">Total Available</p>
          </div>
        </div>
      </Card>

      {/* Earned Badges */}
      <div>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-[#B8860B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          Your Badges ({earnedBadges.length})
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {earnedBadges.map((badge, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#B8860B] to-[#FFD700] flex items-center justify-center text-3xl flex-shrink-0">
                  {badge.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-semibold">{badge.name}</h4>
                    <Badge className={getRarityColor(badge.rarity)}>{badge.rarity}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{badge.description}</p>
                  <p className="text-xs text-muted-foreground">Earned on {badge.date}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Available Badges */}
      <div>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Available Badges ({availableBadges.length})
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {availableBadges.map((badge, index) => (
            <Card key={index} className="p-4 opacity-75">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl flex-shrink-0 grayscale">
                  {badge.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-semibold">{badge.name}</h4>
                    <Badge className={getRarityColor(badge.rarity)}>{badge.rarity}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{badge.description}</p>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">{badge.requirement}</p>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#B8860B] to-[#DAA520] rounded-full h-2"
                        style={{ width: `${badge.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Badge Logic Info */}
      <Card className="p-6 bg-muted">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          About Badge Logic
        </h3>
        <p className="text-sm text-muted-foreground">
          Badges are earned through verified contributions to the ElMahrosa Smart City project. Each badge represents a
          milestone in your journey as a contributor and grants special privileges within the FPBE ecosystem.
        </p>
      </Card>
    </div>
  )
}
