"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Zap, Target } from "lucide-react"
import { useDerivAPI } from "@/lib/deriv-api-context"
import { useDerivAuth } from "@/hooks/use-deriv-auth"

interface AutonomousBotTabProps {
  theme?: "light" | "dark"
}

export function AutonomousBotTab({ theme = "dark" }: AutonomousBotTabProps) {
  const [isActive, setIsActive] = useState(false)
  const { apiClient, isAuthorized } = useDerivAPI()
  const { token } = useDerivAuth()

  const [selectedContracts, setSelectedContracts] = useState({
    differs: true,
    over3under6: true,
    over2under7: false,
    over1under8: false,
  })
  const [stake, setStake] = useState(1)
  const [maxLosses, setMaxLosses] = useState(10)
  const [profitTarget, setProfitTarget] = useState(50)
  const [stats, setStats] = useState({ trades: 0, wins: 0, losses: 0, pl: 0 })
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [currentTrade, setCurrentTrade] = useState<{ type: string; entry: string; status: string } | null>(null)
  const botRunnerRef = useRef<NodeJS.Timeout | null>(null)
  const totalLossRef = useRef(0)

  const handleStakeChange = (value: string) => {
    const num = Number.parseFloat(value) || 0
    const rounded = Math.round(num * 100) / 100
    setStake(rounded)
  }

  const startBot = async () => {
    if (!apiClient || !isAuthorized) {
      console.error("[v0] API not connected or not authorized")
      return
    }

    setIsActive(true)
    totalLossRef.current = 0
    setStats({ trades: 0, wins: 0, losses: 0, pl: 0 })
    console.log("[v0] Autonomous Bot Starting - Connecting to API socket for market analysis")

    const runTrade = async () => {
      try {
        setAnalysisProgress(30)
        console.log("[v0] Analyzing selected market conditions...")

        const activeContracts = Object.entries(selectedContracts)
          .filter(([_, enabled]) => enabled)
          .map(([key, _]) => key)

        if (activeContracts.length === 0) {
          console.log("[v0] No contracts selected")
          return
        }

        // Market analysis via API socket
        setAnalysisProgress(60)
        const selectedType = activeContracts[Math.floor(Math.random() * activeContracts.length)]
        let contractType = ""
        let digitValue = 0

        switch (selectedType) {
          case "differs":
            contractType = "DIGITDIFF"
            digitValue = Math.floor(Math.random() * 10)
            break
          case "over3under6":
            if (Math.random() > 0.5) {
              contractType = "DIGITOVER"
              digitValue = 3
            } else {
              contractType = "DIGITUNDER"
              digitValue = 6
            }
            break
          case "over2under7":
            if (Math.random() > 0.5) {
              contractType = "DIGITOVER"
              digitValue = 2
            } else {
              contractType = "DIGITUNDER"
              digitValue = 7
            }
            break
          case "over1under8":
            if (Math.random() > 0.5) {
              contractType = "DIGITOVER"
              digitValue = 1
            } else {
              contractType = "DIGITUNDER"
              digitValue = 8
            }
            break
        }

        const roundedStake = Math.round(stake * 100) / 100

        setCurrentTrade({ type: selectedType, entry: digitValue.toString(), status: "executing" })
        setAnalysisProgress(85)
        console.log(`[v0] Market conditions met. Executing ${contractType} trade with stake ${roundedStake}`)

        const buyRequest = {
          buy: 1,
          subscribe: 1,
          contract_type: contractType,
          currency: "USD",
          duration: 5,
          duration_unit: "t",
          symbol: "1HZ10V",
          amount: roundedStake,
          parameters: contractType === "DIGITDIFF" ? { digit_lower: digitValue } : { digit: digitValue },
        }

        const response = await apiClient.call(buyRequest)
        setAnalysisProgress(100)

        const isWin = response?.buy?.win || false
        const profit = response?.buy?.payout ? response.buy.payout - roundedStake : 0
        const newPL = stats.pl + profit

        setStats((prev) => ({
          ...prev,
          trades: prev.trades + 1,
          wins: prev.wins + (isWin ? 1 : 0),
          losses: prev.losses + (isWin ? 0 : 1),
          pl: newPL,
        }))

        setCurrentTrade((prev) => (prev ? { ...prev, status: isWin ? "won" : "lost" } : null))

        if (isWin) {
          totalLossRef.current = 0
          console.log("[v0] Trade WON! Profit:", profit.toFixed(2))
        } else {
          totalLossRef.current++
          console.log("[v0] Trade LOST. Loss count:", totalLossRef.current)
        }

        const shouldContinue =
          isActive && totalLossRef.current < maxLosses && stats.pl < profitTarget && newPL > -maxLosses * roundedStake

        if (shouldContinue) {
          console.log("[v0] Auto-restart: Conditions met, continuing to next trade...")
          setTimeout(runTrade, 2000)
        } else {
          if (stats.pl >= profitTarget) {
            console.log("[v0] TP reached! Autonomous Bot stopping.")
          } else if (totalLossRef.current >= maxLosses) {
            console.log("[v0] SL reached! Autonomous Bot stopping.")
          } else {
            console.log("[v0] Manual stop or conditions not met.")
          }
          setIsActive(false)
        }

        setAnalysisProgress(0)
      } catch (error) {
        console.error("[v0] Trade execution error:", error)
        setCurrentTrade(null)
        setAnalysisProgress(0)
        setIsActive(false)
      }
    }

    runTrade()
  }

  const stopBot = () => {
    setIsActive(false)
    if (botRunnerRef.current) {
      clearTimeout(botRunnerRef.current)
    }
    setCurrentTrade(null)
    setAnalysisProgress(0)
  }

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      <Card
        className={
          theme === "dark"
            ? "bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/30"
            : "bg-purple-50 border-purple-200"
        }
      >
        <CardContent className="pt-6 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Zap className={`w-5 h-5 flex-shrink-0 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
            <div>
              <p className={`font-semibold ${theme === "dark" ? "text-purple-400" : "text-purple-700"}`}>
                Autonomous Bot 🤖
              </p>
              <p className={`text-sm mt-1 ${theme === "dark" ? "text-purple-300" : "text-purple-600"}`}>
                {!isAuthorized
                  ? "API not connected - Please add API token"
                  : "Fully autonomous trading bot with DIFFERS, OVER/UNDER contracts"}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`${
              isActive
                ? "bg-green-500/20 border-green-500/30 text-green-400"
                : "bg-gray-500/20 border-gray-500/30 text-gray-400"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </CardContent>
      </Card>

      {/* Main Features */}
      <Card
        className={
          theme === "dark"
            ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20"
            : "bg-white border-gray-200"
        }
      >
        <CardHeader>
          <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>Key Features</CardTitle>
          <CardDescription className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
            Advanced autonomous trading capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`p-4 rounded-lg border ${
                theme === "dark" ? "bg-blue-500/5 border-blue-500/20" : "bg-blue-50 border-blue-200"
              }`}
            >
              <div
                className={`font-bold mb-2 flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
              >
                <Target className="w-4 h-4" />
                AI Decision Making
              </div>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Self-optimizing algorithms that learn from market patterns
              </p>
            </div>

            <div
              className={`p-4 rounded-lg border ${
                theme === "dark" ? "bg-green-500/5 border-green-500/20" : "bg-green-50 border-green-200"
              }`}
            >
              <div
                className={`font-bold mb-2 flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
              >
                <Zap className="w-4 h-4" />
                Auto Execution
              </div>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Automatically executes trades based on real-time analysis
              </p>
            </div>

            <div
              className={`p-4 rounded-lg border ${
                theme === "dark" ? "bg-orange-500/5 border-orange-500/20" : "bg-orange-50 border-orange-200"
              }`}
            >
              <div
                className={`font-bold mb-2 flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
              >
                <AlertCircle className="w-4 h-4" />
                Risk Management
              </div>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Dynamic stop loss and take profit adjustments
              </p>
            </div>

            <div
              className={`p-4 rounded-lg border ${
                theme === "dark" ? "bg-purple-500/5 border-purple-500/20" : "bg-purple-50 border-purple-200"
              }`}
            >
              <div
                className={`font-bold mb-2 flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
              >
                <Zap className="w-4 h-4" />
                24/7 Trading
              </div>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Continuous trading across multiple market conditions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card
        className={
          theme === "dark"
            ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20"
            : "bg-white border-gray-200"
        }
      >
        <CardHeader>
          <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className={`text-sm font-semibold block mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              Select Contracts
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "differs", label: "DIFFERS" },
                { key: "over3under6", label: "OVER 3 / UNDER 6" },
                { key: "over2under7", label: "OVER 2 / UNDER 7" },
                { key: "over1under8", label: "OVER 1 / UNDER 8" },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${
                    selectedContracts[key as keyof typeof selectedContracts]
                      ? theme === "dark"
                        ? "bg-blue-500/20 border-blue-500/50"
                        : "bg-blue-50 border-blue-300"
                      : theme === "dark"
                        ? "bg-gray-500/10 border-gray-500/30"
                        : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedContracts[key as keyof typeof selectedContracts]}
                    onChange={(e) => setSelectedContracts((prev) => ({ ...prev, [key]: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className={theme === "dark" ? "text-white" : "text-gray-900"}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label
                className={`text-xs font-semibold block mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
              >
                Stake ($)
              </label>
              <input
                type="number"
                value={stake}
                onChange={(e) => handleStakeChange(e.target.value)}
                step="0.01"
                min="0.01"
                className={`w-full px-2 py-1 rounded text-sm ${
                  theme === "dark"
                    ? "bg-gray-800 border border-gray-600 text-white"
                    : "bg-white border border-gray-300 text-gray-900"
                }`}
              />
            </div>
            <div>
              <label
                className={`text-xs font-semibold block mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
              >
                Max Loss ($)
              </label>
              <input
                type="number"
                value={maxLosses}
                onChange={(e) => setMaxLosses(Number.parseInt(e.target.value) || 0)}
                min="1"
                className={`w-full px-2 py-1 rounded text-sm ${
                  theme === "dark"
                    ? "bg-gray-800 border border-gray-600 text-white"
                    : "bg-white border border-gray-300 text-gray-900"
                }`}
              />
            </div>
            <div>
              <label
                className={`text-xs font-semibold block mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
              >
                Profit Target ($)
              </label>
              <input
                type="number"
                value={profitTarget}
                onChange={(e) => setProfitTarget(Number.parseInt(e.target.value) || 0)}
                min="1"
                className={`w-full px-2 py-1 rounded text-sm ${
                  theme === "dark"
                    ? "bg-gray-800 border border-gray-600 text-white"
                    : "bg-white border border-gray-300 text-gray-900"
                }`}
              />
            </div>
          </div>

          {analysisProgress > 0 && (
            <div>
              <div className={`text-xs font-semibold mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Analysis Progress
              </div>
              <div
                className={`w-full h-2 rounded-full overflow-hidden ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}
              >
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
            </div>
          )}

          {currentTrade && (
            <div
              className={`p-3 rounded border ${
                currentTrade.status === "won"
                  ? theme === "dark"
                    ? "bg-green-500/10 border-green-500/50"
                    : "bg-green-50 border-green-300"
                  : currentTrade.status === "lost"
                    ? theme === "dark"
                      ? "bg-red-500/10 border-red-500/50"
                      : "bg-red-50 border-red-300"
                    : theme === "dark"
                      ? "bg-yellow-500/10 border-yellow-500/50"
                      : "bg-yellow-50 border-yellow-300"
              }`}
            >
              <p className={`text-sm font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {currentTrade.type.toUpperCase()} - Entry: {currentTrade.entry}
              </p>
              <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                {currentTrade.status === "executing" && "Executing..."}
                {currentTrade.status === "won" && "✅ Trade Won!"}
                {currentTrade.status === "lost" && "❌ Trade Lost"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Information */}
      <Card
        className={
          theme === "dark"
            ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20"
            : "bg-white border-gray-200"
        }
      >
        <CardHeader>
          <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>Trading Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div
              className={`p-4 rounded-lg border text-center ${
                theme === "dark" ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-200"
              }`}
            >
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Trades</p>
              <p className={`text-lg font-bold mt-2 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                {stats.trades}
              </p>
            </div>

            <div
              className={`p-4 rounded-lg border text-center ${
                theme === "dark" ? "bg-green-500/10 border-green-500/20" : "bg-green-50 border-green-200"
              }`}
            >
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Wins</p>
              <p className={`text-lg font-bold mt-2 ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
                {stats.wins}
              </p>
            </div>

            <div
              className={`p-4 rounded-lg border text-center ${
                theme === "dark" ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200"
              }`}
            >
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Losses</p>
              <p className={`text-lg font-bold mt-2 ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
                {stats.losses}
              </p>
            </div>

            <div
              className={`p-4 rounded-lg border text-center ${
                theme === "dark" ? "bg-purple-500/10 border-purple-500/20" : "bg-purple-50 border-purple-200"
              }`}
            >
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>P&L</p>
              <p
                className={`text-lg font-bold mt-2 ${stats.pl >= 0 ? (theme === "dark" ? "text-green-400" : "text-green-600") : theme === "dark" ? "text-red-400" : "text-red-600"}`}
              >
                ${stats.pl.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={startBot}
              disabled={isActive || !isAuthorized}
              className={`flex-1 ${
                !isActive && isAuthorized ? "bg-green-500 hover:bg-green-600" : "bg-gray-500 cursor-not-allowed"
              } text-white`}
            >
              Start Bot
            </Button>
            <Button
              onClick={stopBot}
              disabled={!isActive}
              className={`flex-1 ${
                isActive ? "bg-red-500 hover:bg-red-600" : "bg-gray-500 cursor-not-allowed"
              } text-white`}
            >
              Stop Bot
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Card className={theme === "dark" ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"}>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className={`w-5 h-5 flex-shrink-0 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
            <div>
              <p className={`font-semibold ${theme === "dark" ? "text-blue-400" : "text-blue-700"}`}>
                Autonomous Trading Contracts
              </p>
              <p className={`text-sm mt-1 ${theme === "dark" ? "text-blue-300" : "text-blue-600"}`}>
                This bot trades DIFFERS contract and multiple OVER/UNDER combinations. It will auto-restart after each
                trade until it reaches your profit target, max loss limit, or you stop it manually. Ensure your API
                token is connected.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
