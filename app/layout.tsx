import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import Script from "next/script"

export const metadata: Metadata = {
  title: "Made with App Studio",
  description: "FPBE - First Pimisr Bank Elmahrosa | Official Pi Network Bank | TEOS Egypt",
  metadataBase: new URL("https://bank.teosegypt.com"),
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: "#D4AF37",
  manifest: "/manifest.json",
  openGraph: {
    title: "FPBE - First Pimisr Bank Elmahrosa",
    description: "Official Pi Network Bank - TEOS Egypt - Alexandria Land Project",
    url: "https://bank.teosegypt.com",
    siteName: "FPBE Bank",
    locale: "en_EG",
    type: "website",
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <Script src="https://sdk.minepi.com/pi-sdk.js" strategy="beforeInteractive" />
        <meta name="pi-network-app" content="fpbe5523" />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
