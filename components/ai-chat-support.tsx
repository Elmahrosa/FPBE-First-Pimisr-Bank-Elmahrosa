"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageCircle, Send, X } from 'lucide-react'

export function AiChatSupport() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai", text: string }>>([])

  const handleSend = () => {
    if (!message.trim()) return
    
    setMessages(prev => [...prev, { role: "user", text: message }])
    
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: "ai",
        text: "Thank you for contacting FPBE Bank. How can I help you today? For immediate assistance, please use the WhatsApp button to contact Founder Ayman Seif directly."
      }])
    }, 1000)
    
    setMessage("")
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-br from-[#B8860B] to-[#DAA520] rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50"
        title="AI Support Chat"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-24 right-4 w-80 z-50">
      <Card className="shadow-xl">
        <CardHeader className="bg-gradient-to-br from-[#B8860B] to-[#DAA520] text-white">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">AI Support</CardTitle>
            <button onClick={() => setIsOpen(false)} className="hover:opacity-80">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs opacity-90 mt-1">Ask anything about FPBE Bank</p>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                Welcome! How can I help you today?
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`rounded-lg p-3 text-sm ${
                  msg.role === "user"
                    ? "bg-[#B8860B]/10 ml-8"
                    : "bg-muted mr-8"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your question..."
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              onClick={handleSend}
              size="icon"
              className="bg-gradient-to-br from-[#B8860B] to-[#DAA520] hover:opacity-90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
