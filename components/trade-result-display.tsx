"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface TradeResultProps {
  market: string
  contractType: string
  entrySpot: number
  entryPrice: number
  exitSpot: number
  exitPrice: number
  stake: number
  profit: number
  result: "WIN" | "LOSS"
  duration: number
  theme?: "light" | "dark"
  timestamp?: number
}

export function TradeResultDisplay({
  market,
  contractType,
  entrySpot,
  entryPrice,
  exitSpot,
  exitPrice,
  stake,
  profit,
  result,
  duration,
  theme = "dark",
  timestamp,
}: TradeResultProps) {
  const [displayResult, setDisplayResult] = useState<typeof result>(result)

  useEffect(() => {
    setDisplayResult(result)
    console.log(
      `[v0] Trade Result: ${result} | Market: ${market} | Profit: ${profit} | Entry: ${entrySpot} → Exit: ${exitSpot}`,
    )
  }, [result, market, profit, entrySpot, exitSpot])

  const profitPercent = ((profit / stake) * 100).toFixed(1)
  const isWin = displayResult === "WIN"

  return (
    <Card
      className={`${
        isWin
          ? theme === "dark"
            ? "bg-emerald-500/10 border-emerald-500/30"
            : "bg-emerald-50 border-emerald-200"
          : theme === "dark"
            ? "bg-red-500/10 border-red-500/30"
            : "bg-red-50 border-red-200"
      }`}
    >
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <Badge
              className={`text-lg px-6 py-2 ${
                isWin
                  ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.6)] animate-bounce"
                  : "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)]"
              }`}
            >
              {isWin ? "🎉 Congrats!" : "⚠️ Oops!"}
            </Badge>
            <div
              className={`text-2xl font-bold ${isWin ? (theme === "dark" ? "text-emerald-400" : "text-emerald-600") : theme === "dark" ? "text-red-400" : "text-red-600"}`}
            >
              {isWin ? "Take Profit Hit" : "Stop Loss Reached"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Market</div>
              <div className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{market}</div>
            </div>
            <div>
              <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Contract</div>
              <div className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{contractType}</div>
            </div>
            <div>
              <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Entry Spot</div>
              <div className={`font-semibold ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>
                {entrySpot} @ {entryPrice.toFixed(5)}
              </div>
            </div>
            <div>
              <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Exit Spot</div>
              <div className={`font-semibold ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`}>
                {exitSpot} @ {exitPrice.toFixed(5)}
              </div>
            </div>
            <div>
              <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Stake</div>
              <div className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {stake.toFixed(2)}
              </div>
            </div>
            <div>
              <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Duration</div>
              <div className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{duration}s</div>
            </div>
          </div>

          <div
            className={`rounded-lg p-4 text-center border-2 ${
              isWin
                ? theme === "dark"
                  ? "bg-emerald-500/20 border-emerald-500"
                  : "bg-emerald-100 border-emerald-400"
                : theme === "dark"
                  ? "bg-red-500/20 border-red-500"
                  : "bg-red-100 border-red-400"
            }`}
          >
            <div className={`text-sm mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Profit / Loss</div>
            <div
              className={`text-4xl font-bold ${isWin ? (theme === "dark" ? "text-emerald-400" : "text-emerald-600") : theme === "dark" ? "text-red-400" : "text-red-600"}`}
            >
              {isWin ? "+" : ""}
              {profit.toFixed(2)}
            </div>
            <div
              className={`text-lg mt-2 ${isWin ? (theme === "dark" ? "text-emerald-400" : "text-emerald-600") : theme === "dark" ? "text-red-400" : "text-red-600"}`}
            >
              ({isWin ? "+" : ""}
              {profitPercent}%)
            </div>
          </div>

          {/* Timestamp */}
          {timestamp && (
            <div className={`text-xs text-center ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
              {new Date(timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
