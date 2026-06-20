import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Suspense } from "react"
import { DerivAPIProvider } from "@/lib/deriv-api-context"

export const metadata: Metadata = {
  title: "Profit Hub - Trading Bot Simulator & Market Analysis",
  description: "Real-time Deriv market analysis and trading signals with advanced bot simulator",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <DerivAPIProvider>
          <Suspense fallback={null}>{children}</Suspense>
        </DerivAPIProvider>
        <Analytics />
      </body>
    </html>
  )
}
