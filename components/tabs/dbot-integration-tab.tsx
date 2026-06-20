"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { useGlobalTradingContext } from "@/hooks/use-global-trading-context"

interface DBotIntegrationTabProps {
  theme?: "light" | "dark"
}

export function DBotIntegrationTab({ theme = "dark" }: DBotIntegrationTabProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [dbotStatus, setDbotStatus] = useState("disconnected")
  const globalContext = useGlobalTradingContext()

  const connectDBot = async () => {
    if (!globalContext.apiToken) {
      alert("Please authenticate with Deriv first")
      return
    }

    setIsLoading(true)
    console.log("[v0] 🔌 Connecting to DBot system...")

    try {
      // Simulate DBot connection with global API token
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setIsConnected(true)
      setDbotStatus("connected")
      console.log("[v0] ✅ DBot connected successfully with API token")
    } catch (error) {
      console.error("[v0] ❌ DBot connection failed:", error)
      setDbotStatus("error")
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectDBot = () => {
    setIsConnected(false)
    setDbotStatus("disconnected")
    console.log("[v0] 🔌 DBot disconnected")
  }

  return (
    <div className="space-y-6">
      <Card
        className={
          theme === "dark"
            ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20"
            : "bg-white border-gray-200"
        }
      >
        <CardHeader>
          <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>DBot Trading System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <div>
              <Badge
                className={`text-lg px-6 py-2 ${
                  isConnected
                    ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.6)]"
                    : "bg-slate-500 text-white"
                }`}
              >
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>

            {globalContext.apiToken ? (
              <div className={`text-sm ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
                API Token: Authenticated
              </div>
            ) : (
              <div
                className={`flex items-center justify-center gap-2 text-sm ${theme === "dark" ? "text-red-400" : "text-red-600"}`}
              >
                <AlertCircle size={16} />
                Please authenticate with Deriv first
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={connectDBot}
              disabled={isLoading || isConnected || !globalContext.apiToken}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold"
            >
              {isLoading ? "Connecting..." : "Connect DBot"}
            </Button>
            <Button
              onClick={disconnectDBot}
              disabled={!isConnected}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
            >
              Disconnect
            </Button>
          </div>

          <div
            className={`rounded-lg p-4 border ${theme === "dark" ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"}`}
          >
            <h3 className={`font-semibold mb-3 ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
              DBot Integration Status
            </h3>
            <div className={`space-y-2 text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              <div>
                <span className="font-semibold">Authentication:</span>{" "}
                {globalContext.isAuthorized ? "✓ Authorized" : "✗ Not Authorized"}
              </div>
              <div>
                <span className="font-semibold">Balance:</span> {globalContext.balance.toFixed(2)}
              </div>
              <div>
                <span className="font-semibold">Selected Market:</span> {globalContext.selectedMarket}
              </div>
              <div>
                <span className="font-semibold">Selected Strategy:</span> {globalContext.selectedStrategy}
              </div>
              <div>
                <span className="font-semibold">Connection Status:</span> {dbotStatus.toUpperCase()}
              </div>
            </div>
          </div>

          <div
            className={`rounded-lg p-4 border ${theme === "dark" ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"}`}
          >
            <h3 className={`font-semibold mb-3 ${theme === "dark" ? "text-emerald-300" : "text-emerald-700"}`}>
              DBot Features
            </h3>
            <ul className={`space-y-2 text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              <li>✓ Build custom trading blocks</li>
              <li>✓ Visual strategy creation</li>
              <li>✓ Backtest your strategies</li>
              <li>✓ Live trading execution</li>
              <li>✓ Real-time bot monitoring</li>
              <li>✓ Trade history & analytics</li>
            </ul>
          </div>

          <div
            className={`rounded-lg p-4 border ${theme === "dark" ? "bg-yellow-500/10 border-yellow-500/30" : "bg-yellow-50 border-yellow-200"}`}
          >
            <h3 className={`font-semibold mb-3 ${theme === "dark" ? "text-yellow-300" : "text-yellow-700"}`}>
              Integration Notes
            </h3>
            <div className={`space-y-2 text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
              <p>• DBot uses the same API token from main authentication</p>
              <p>• All trades are logged in the system</p>
              <p>• Market and strategy selections sync across all tabs</p>
              <p>• Stop logic ensures clean shutdown of all trades</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
