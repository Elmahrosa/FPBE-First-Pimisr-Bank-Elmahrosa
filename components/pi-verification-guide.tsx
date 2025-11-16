"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface PiVerificationGuideProps {
  onBack: () => void
}

export function PiVerificationGuide({ onBack }: PiVerificationGuideProps) {
  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <h2 className="text-2xl font-bold">Get Pi Network Verified Badge</h2>
      </div>

      <Card className="p-6 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold">Blue Verified Badge</h3>
            <p className="text-sm opacity-90">Official Pi Network Recognition</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <span className="text-2xl">📋</span>
          Steps to Get Verified by Pi Network
        </h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-[#B8860B] text-white flex items-center justify-center font-bold flex-shrink-0">
              1
            </div>
            <div>
              <h4 className="font-semibold mb-1">Complete Pi KYC Verification</h4>
              <p className="text-sm text-muted-foreground mb-2">
                In the Pi Network mobile app, complete your KYC (Know Your Customer) verification through Yoti or other approved validators.
              </p>
              <Badge className="bg-green-500 text-white">Required</Badge>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-[#B8860B] text-white flex items-center justify-center font-bold flex-shrink-0">
              2
            </div>
            <div>
              <h4 className="font-semibold mb-1">Register Your App with Pi Network</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Go to <span className="font-mono bg-muted px-1 rounded">https://develop.pi/</span> and register FPBE Bank as a Pi App.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>App Name: First Pimisr Bank Elmahrosa</li>
                <li>App URL: https://firstpimisrbanke1502.pinet.com</li>
                <li>Category: Finance & Banking</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-[#B8860B] text-white flex items-center justify-center font-bold flex-shrink-0">
              3
            </div>
            <div>
              <h4 className="font-semibold mb-1">Implement Pi SDK Properly</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Ensure Pi SDK is correctly integrated with proper authentication and payment flows.
              </p>
              <Badge className="bg-blue-500 text-white">Technical</Badge>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-[#B8860B] text-white flex items-center justify-center font-bold flex-shrink-0">
              4
            </div>
            <div>
              <h4 className="font-semibold mb-1">Submit for Pi Network Review</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Once your app is functional and follows Pi Network guidelines, submit it for official review through the Pi Developer Portal.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Demonstrate real utility for Pi users</li>
                <li>Show secure transaction handling</li>
                <li>Prove compliance with Pi policies</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-[#B8860B] text-white flex items-center justify-center font-bold flex-shrink-0">
              5
            </div>
            <div>
              <h4 className="font-semibold mb-1">Maintain Good Standing</h4>
              <p className="text-sm text-muted-foreground mb-2">
                After verification, maintain app quality, respond to user feedback, and keep your app updated with Pi Network standards.
              </p>
              <Badge className="bg-purple-500 text-white">Ongoing</Badge>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-[#B8860B]/10">
        <h3 className="font-semibold mb-3">Pi Developer Portal</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Access the official Pi Network Developer Portal to register your app and start the verification process.
        </p>
        <Button 
          onClick={() => window.open('https://develop.pi/', '_blank')}
          className="w-full bg-[#B8860B] text-white"
        >
          Open Pi Developer Portal
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-3">Benefits of Blue Verified Badge</h3>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium text-sm">Official Recognition</p>
              <p className="text-xs text-muted-foreground">Get listed in Pi Network's official app directory</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium text-sm">Increased Trust</p>
              <p className="text-xs text-muted-foreground">Blue badge shows users your app is verified and secure</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium text-sm">Higher Visibility</p>
              <p className="text-xs text-muted-foreground">Verified apps appear higher in search and recommendations</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium text-sm">Access to Premium Features</p>
              <p className="text-xs text-muted-foreground">Unlock advanced Pi SDK features and developer support</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
