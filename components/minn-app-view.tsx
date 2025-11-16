"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface MinnAppViewProps {
  onBack: () => void
}

export function MinnAppView({ onBack }: MinnAppViewProps) {
  const [activeSection, setActiveSection] = useState<"overview" | "identity" | "banking" | "dao" | "services">(
    "overview",
  )

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">ElMahrosa Minn</h1>
          <p className="text-sm text-muted-foreground">Egypt's Civic Smart City Protocol</p>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-[#B8860B] via-[#DAA520] to-[#FFD700] p-6 rounded-xl text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold">Pi-Powered Civic Infrastructure</h2>
            <p className="text-sm opacity-90">Decentralized governance for Alexandria & beyond</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed opacity-95">
          ElMahrosa Minn integrates Pi Network with real-world civic services, decentralized finance, and sovereign
          infrastructure. Empowering citizens with Pi-based identity, banking, voting, and urban coordination.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: "overview", label: "Overview" },
          { id: "identity", label: "Civic Identity" },
          { id: "banking", label: "Smart Banking" },
          { id: "dao", label: "Urban DAO" },
          { id: "services", label: "Services" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeSection === tab.id ? "bg-[#B8860B] text-white" : "bg-card text-muted-foreground hover:bg-accent/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Sections */}
      {activeSection === "overview" && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#B8860B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Vision
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              ElMahrosa is a civic smart city protocol integrating the Pi Network with real-world services,
              decentralized finance, and sovereign infrastructure. We aim to empower citizens with Pi-based identity,
              banking, voting, and urban coordination.
            </p>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Core Modules</h3>
            <div className="space-y-3">
              {[
                {
                  icon: "👤",
                  title: "Pi Civic Identity",
                  desc: "Wallet-linked citizen profiles",
                },
                {
                  icon: "🏦",
                  title: "Smart Banking",
                  desc: "Pi-powered savings, swaps, and staking",
                },
                {
                  icon: "🗳️",
                  title: "Urban DAO",
                  desc: "Voting on city upgrades, budgets, and proposals",
                },
                {
                  icon: "🎫",
                  title: "Service Credits",
                  desc: "Pi-based tokens for transport, energy, and housing",
                },
                {
                  icon: "📱",
                  title: "Mobile App",
                  desc: "Android-first civic dashboard",
                },
              ].map((module, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-accent/5 rounded-lg">
                  <span className="text-2xl">{module.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{module.title}</p>
                    <p className="text-xs text-muted-foreground">{module.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-[#B8860B]/10 to-[#FFD700]/10 border-[#B8860B]/20">
            <h3 className="font-semibold mb-2 text-[#B8860B]">Tech Stack</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="font-medium">Frontend</p>
                <p className="text-xs text-muted-foreground">React Native, Vite</p>
              </div>
              <div>
                <p className="font-medium">Backend</p>
                <p className="text-xs text-muted-foreground">Node.js, Firebase</p>
              </div>
              <div>
                <p className="font-medium">Blockchain</p>
                <p className="text-xs text-muted-foreground">Solidity, Anchor</p>
              </div>
              <div>
                <p className="font-medium">Wallets</p>
                <p className="text-xs text-muted-foreground">Pi, Phantom, NFTs</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeSection === "identity" && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Pi Civic Identity</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your wallet-linked citizen profile for accessing all ElMahrosa services
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-accent/5 rounded-lg">
                <span className="text-sm font-medium">Identity Status</span>
                <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full">Verified</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-accent/5 rounded-lg">
                <span className="text-sm font-medium">Civic Badge</span>
                <span className="text-xs bg-[#B8860B]/10 text-[#B8860B] px-2 py-1 rounded-full">Pioneer</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-accent/5 rounded-lg">
                <span className="text-sm font-medium">Contribution Score</span>
                <span className="text-sm font-semibold text-[#B8860B]">0 points</span>
              </div>
            </div>
          </Card>

          <Button className="w-full bg-[#B8860B] hover:bg-[#DAA520]">Update Identity Profile</Button>
        </div>
      )}

      {activeSection === "banking" && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Smart Banking Services</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Integrated with FPBE Bank for seamless Pi-powered financial services
            </p>
            <div className="space-y-2">
              {["Savings Accounts", "Pi Swaps", "Staking Pools", "Micro-loans", "Payment Gateway"].map((service) => (
                <div key={service} className="flex items-center gap-3 p-3 bg-accent/5 rounded-lg">
                  <svg className="w-5 h-5 text-[#B8860B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-medium">{service}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {activeSection === "dao" && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Urban DAO Governance</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Vote on city upgrades, budgets, and proposals using your Pi stake
            </p>
            <div className="space-y-3">
              <div className="p-4 border border-border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-sm">Proposal #001</h4>
                    <p className="text-xs text-muted-foreground">Solar Panel Installation</p>
                  </div>
                  <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full">Active</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Install solar panels on public buildings to reduce energy costs
                </p>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                    Vote Yes
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                    Vote No
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeSection === "services" && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Service Credits</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Use Pi-based tokens for transport, energy, housing, and more
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "🚌", name: "Transport", balance: "0 TC" },
                { icon: "⚡", name: "Energy", balance: "0 EC" },
                { icon: "🏠", name: "Housing", balance: "0 HC" },
                { icon: "💧", name: "Water", balance: "0 WC" },
              ].map((service) => (
                <div key={service.name} className="p-4 bg-accent/5 rounded-lg text-center">
                  <div className="text-3xl mb-2">{service.icon}</div>
                  <p className="text-sm font-medium">{service.name}</p>
                  <p className="text-xs text-muted-foreground">{service.balance}</p>
                </div>
              ))}
            </div>
          </Card>

          <Button className="w-full bg-[#B8860B] hover:bg-[#DAA520]">Purchase Service Credits</Button>
        </div>
      )}

      {/* Footer Links */}
      <Card className="p-4 bg-gradient-to-br from-[#B8860B]/5 to-[#FFD700]/5">
        <h3 className="font-semibold mb-3 text-sm">Join the Movement</h3>
        <div className="space-y-2">
          <a
            href="https://github.com/Elmahrosa/ElMahrosa-Pi-Smart-City"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[#B8860B] hover:underline"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub Repository
          </a>
          <a
            href="https://t.me/ElMahrosaDAO"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[#B8860B] hover:underline"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            Telegram Community
          </a>
        </div>
      </Card>
    </div>
  )
}
