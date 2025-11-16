export interface VoiceCommand {
  action: string
  details: string
}

export class VoiceBankingService {
  private apiUrl: string
  private recognition: any

  constructor(apiUrl: string = process.env.NEXT_PUBLIC_VOICE_API_URL || 'http://localhost:8000') {
    this.apiUrl = apiUrl
    
    // Initialize Web Speech API for browser
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition()
        this.recognition.lang = 'id-ID' // Indonesian
        this.recognition.continuous = false
        this.recognition.interimResults = false
      }
    }
  }

  async startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'))
        return
      }

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        resolve(transcript)
      }

      this.recognition.onerror = (event: any) => {
        reject(new Error(event.error))
      }

      this.recognition.start()
    })
  }

  async processCommand(command: string): Promise<VoiceCommand> {
    try {
      // For now, simple client-side intent detection
      const lowerCommand = command.toLowerCase()
      
      if (lowerCommand.includes('transfer') || lowerCommand.includes('kirim')) {
        return {
          action: 'Transfer Dana',
          details: command
        }
      } else if (lowerCommand.includes('saldo') || lowerCommand.includes('balance')) {
        return {
          action: 'Cek Saldo',
          details: command
        }
      } else if (lowerCommand.includes('riwayat') || lowerCommand.includes('history')) {
        return {
          action: 'Lihat Riwayat',
          details: command
        }
      } else if (lowerCommand.includes('tukar') || lowerCommand.includes('swap')) {
        return {
          action: 'Tukar Token',
          details: command
        }
      } else {
        return {
          action: 'Tidak Diketahui',
          details: command
        }
      }
    } catch (error) {
      throw new Error('Failed to process voice command')
    }
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop()
    }
  }
}

export const voiceBanking = new VoiceBankingService()
