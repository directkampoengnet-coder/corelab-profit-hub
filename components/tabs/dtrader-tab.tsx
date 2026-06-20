"use client"

import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { DerivAuth } from "@/components/deriv-auth"
import { DERIV_CONFIG } from "@/lib/deriv-config"
import { PlatformLauncher } from "@/components/platform-launcher"
import { TrendingUp } from "lucide-react"

interface DTraderTabProps {
  theme?: "light" | "dark"
}

export function DTraderTab({ theme = "dark" }: DTraderTabProps) {
  const { token, isLoggedIn } = useDerivAuth()

  const dtraderUrl = token
    ? `https://app.deriv.com/dtrader?app_id=${DERIV_CONFIG.APP_ID}&token1=${token}`
    : `https://app.deriv.com/dtrader?app_id=${DERIV_CONFIG.APP_ID}`

  return (
    <div className={`min-h-[80vh] flex flex-col ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
      <div className="mb-4">
        <DerivAuth theme={theme} />
      </div>

      <div className="max-w-4xl mx-auto w-full px-4">
        <PlatformLauncher
          title="DTrader"
          description="Advanced trading platform with powerful charting and analysis tools"
          platformUrl={dtraderUrl}
          isAuthenticated={isLoggedIn}
          icon={<TrendingUp className="h-8 w-8" />}
          features={[
            "Trade options, multipliers, and more",
            "Advanced charting with technical indicators",
            "Multiple trade types and durations",
            "Real-time market data and analysis",
            "Mobile-responsive interface",
          ]}
          theme={theme}
        />
      </div>
    </div>
  )
}
