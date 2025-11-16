"use client"

import { useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { voiceBanking } from '@/lib/voice-banking'

interface VoiceCommandButtonProps {
  onCommand?: (action: string, details: string) => void
}

export function VoiceCommandButton({ onCommand }: VoiceCommandButtonProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')

  const handleVoiceCommand = async () => {
    if (isListening) {
      voiceBanking.stopListening()
      setIsListening(false)
      return
    }

    try {
      setIsListening(true)
      setError('')
      setTranscript('Listening...')

      const command = await voiceBanking.startListening()
      setTranscript(command)

      const result = await voiceBanking.processCommand(command)
      
      if (onCommand) {
        onCommand(result.action, result.details)
      }

      // Auto-clear after 3 seconds
      setTimeout(() => {
        setTranscript('')
        setIsListening(false)
      }, 3000)

    } catch (err: any) {
      setError(err.message || 'Voice recognition failed')
      setIsListening(false)
      setTimeout(() => setError(''), 3000)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleVoiceCommand}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          isListening 
            ? 'bg-red-500 animate-pulse' 
            : 'bg-gradient-to-br from-[#B8860B] to-[#DAA520]'
        }`}
        title="Voice Banking"
      >
        {isListening ? (
          <MicOff className="w-6 h-6 text-white" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
      </button>
      
      {(transcript || error) && (
        <div className={`absolute bottom-full mb-2 right-0 p-3 rounded-lg shadow-lg min-w-[200px] ${
          error ? 'bg-red-100 text-red-800' : 'bg-white text-gray-800'
        }`}>
          <p className="text-sm font-medium">
            {error || transcript}
          </p>
        </div>
      )}
    </div>
  )
}
