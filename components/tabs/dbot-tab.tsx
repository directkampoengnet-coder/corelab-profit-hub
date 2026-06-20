"use client"

import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { DerivAuth } from "@/components/deriv-auth"
import { DERIV_CONFIG } from "@/lib/deriv-config"
import { PlatformLauncher } from "@/components/platform-launcher"
import { Bot } from "lucide-react"

interface DBotTabProps {
  theme?: "light" | "dark"
}

export function DBotTab({ theme = "dark" }: DBotTabProps) {
  const { token, isLoggedIn } = useDerivAuth()

  const dbotUrl = token
    ? `https://app.deriv.com/bot?app_id=${DERIV_CONFIG.APP_ID}&token1=${token}`
    : `https://app.deriv.com/bot?app_id=${DERIV_CONFIG.APP_ID}`

  return (
    <div className={`min-h-[80vh] flex flex-col ${theme === "dark" ? "bg-gray-900" : "bg-white"}`}>
      <div className="mb-4">
        <DerivAuth theme={theme} />
      </div>

      <div className="max-w-4xl mx-auto w-full px-4">
        <PlatformLauncher
          title="Deriv Bot"
          description="Automate your trading strategy with our visual block-based bot builder"
          platformUrl={dbotUrl}
          isAuthenticated={isLoggedIn}
          icon={<Bot className="h-8 w-8" />}
          features={[
            "Visual block-based strategy builder - no coding required",
            "Pre-built trading strategies and templates",
            "Backtesting capabilities to test strategies",
            "Real-time bot performance monitoring",
            "Compatible with all Deriv markets",
          ]}
          theme={theme}
        />
      </div>
    </div>
  )
}
