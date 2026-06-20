"use client"
import { Button } from "@/components/ui/button"
import { Bot } from "lucide-react"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import Link from "next/link"

interface DerivPlatformsProps {
  derivToken?: string
  theme?: "light" | "dark"
}

export default function DerivPlatforms({ derivToken, theme = "dark" }: DerivPlatformsProps) {
  const { isLoggedIn, requestLogin } = useDerivAuth()

  return (
    <div
      className={`w-full rounded-2xl shadow p-6 sm:p-8 ${theme === "dark" ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border border-blue-500/20" : "bg-white border border-gray-200"}`}
    >
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="mb-6 p-4 bg-blue-500/10 rounded-full">
          <Bot size={48} className="text-blue-400" />
        </div>

        <h2 className={`text-2xl font-bold mb-3 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          DBot Trading Platform
        </h2>

        <p className={`mb-6 text-base max-w-2xl ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
          Automate your trades with Deriv Bot. Build custom trading strategies using our visual block-based interface,
          or choose from pre-built strategies to get started quickly.
        </p>

        <div
          className={`border border-dashed rounded-lg p-8 w-full max-w-2xl ${theme === "dark" ? "border-blue-500/30 bg-[#0a0e27]/30" : "border-gray-300 bg-gray-50"}`}
        >
          {!isLoggedIn ? (
            <>
              <p className={`mb-6 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                Please log in to access DBot and start automated trading
              </p>
              <Button
                onClick={requestLogin}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl shadow-md transition-all hover:scale-105 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Login with Deriv
              </Button>
            </>
          ) : (
            <>
              <p className={`mb-6 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                Click below to launch DBot trading platform
              </p>
              <Link href="/dbot">
                <Button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl shadow-md transition-all hover:scale-105 bg-blue-600 hover:bg-blue-700 text-white">
                  <Bot size={18} />
                  Launch DBot Platform
                </Button>
              </Link>
              <p className={`mt-4 text-xs ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
                Your session is authenticated and ready to trade
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 w-full max-w-2xl">
          <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-[#0a0e27]/50" : "bg-gray-100"}`}>
            <h3 className={`font-semibold mb-2 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
              Visual Builder
            </h3>
            <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Drag-and-drop blocks to create trading strategies
            </p>
          </div>
          <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-[#0a0e27]/50" : "bg-gray-100"}`}>
            <h3 className={`font-semibold mb-2 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
              Pre-built Strategies
            </h3>
            <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Start with proven strategies and customize them
            </p>
          </div>
          <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-[#0a0e27]/50" : "bg-gray-100"}`}>
            <h3 className={`font-semibold mb-2 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
              Backtesting
            </h3>
            <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Test your strategies with historical data
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
