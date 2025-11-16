"use client"

interface QuickActionsProps {
  onNavigate?: (view: string) => void
}

export function QuickActions({ onNavigate }: QuickActionsProps) {
  const actions = [
    { icon: "↑", label: "Send Pi", color: "bg-[#B8860B]", view: "transfer" },
    { icon: "💰", label: "Loans", color: "bg-[#DAA520]", view: "loans" },
    { icon: "📈", label: "Invest", color: "bg-[#FFD700]", view: "investments" },
    { icon: "🏦", label: "Savings", color: "bg-[#F0E68C]", view: "savings" },
    { icon: "π", label: "Pi Wallet", color: "bg-[#B8860B]", view: "pi-wallet" },
    { icon: "T", label: "TEOS", color: "bg-[#DAA520]", view: "teos" },
  ]

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            className="flex flex-col items-center gap-2"
            onClick={() => onNavigate?.(action.view)}
          >
            <div
              className={`w-14 h-14 rounded-2xl ${action.color} text-white flex items-center justify-center text-2xl shadow-sm font-bold`}
            >
              {action.icon}
            </div>
            <span className="text-xs text-muted-foreground text-center">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
