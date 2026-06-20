"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LastDigitsDisplay } from "@/components/last-digits-display"
import type { Signal, AnalysisResult } from "@/lib/analysis-engine"

interface EvenOddTabProps {
  analysis: AnalysisResult | null
  signals: Signal[]
  currentDigit: number | null
  currentPrice: number | null
  recentDigits: number[]
  theme?: "light" | "dark"
}

export function EvenOddTab({
  analysis,
  signals,
  currentDigit,
  currentPrice,
  recentDigits,
  theme = "dark",
}: EvenOddTabProps) {
  const [tradeTimer, setTradeTimer] = useState<number>(0)
  const [marketChanged, setMarketChanged] = useState(false)
  const [powerTrend, setPowerTrend] = useState<"increasing" | "decreasing" | "stable">("stable")

  const safeRecentDigits = recentDigits && Array.isArray(recentDigits) ? recentDigits : []

  const last100Digits = safeRecentDigits.slice(-100)
  const last50Digits = safeRecentDigits.slice(-50)
  const last25Digits = safeRecentDigits.slice(-25)
  const last10Digits = safeRecentDigits.slice(-10)

  // Calculate Even/Odd percentages across different timeframes
  const evenPercent100 = (last100Digits.filter((d) => d % 2 === 0).length / Math.max(1, last100Digits.length)) * 100
  const oddPercent100 = (last100Digits.filter((d) => d % 2 === 1).length / Math.max(1, last100Digits.length)) * 100

  const evenPercent50 = (last50Digits.filter((d) => d % 2 === 0).length / Math.max(1, last50Digits.length)) * 100
  const oddPercent50 = (last50Digits.filter((d) => d % 2 === 1).length / Math.max(1, last50Digits.length)) * 100

  const evenPercent25 = (last25Digits.filter((d) => d % 2 === 0).length / Math.max(1, last25Digits.length)) * 100
  const oddPercent25 = (last25Digits.filter((d) => d % 2 === 1).length / Math.max(1, last25Digits.length)) * 100

  const evenPercent10 = (last10Digits.filter((d) => d % 2 === 0).length / Math.max(1, last10Digits.length)) * 100
  const oddPercent10 = (last10Digits.filter((d) => d % 2 === 1).length / Math.max(1, last10Digits.length)) * 100

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (tradeTimer > 0) {
      interval = setInterval(() => {
        setTradeTimer((prev) => (prev > 1 ? prev - 1 : 0))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [tradeTimer])

  useEffect(() => {
    if (evenPercent10 > evenPercent50) {
      setPowerTrend("increasing")
    } else if (evenPercent10 < evenPercent50) {
      setPowerTrend("decreasing")
    } else {
      setPowerTrend("stable")
    }
  }, [evenPercent10, evenPercent50])

  if (!analysis) {
    return (
      <div className="text-center py-16">
        <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Loading analysis...</p>
      </div>
    )
  }

  const evenIncreasing = evenPercent10 > evenPercent50
  const oddIncreasing = oddPercent10 > oddPercent50
  const maxCurrent = Math.max(evenPercent10, oddPercent10)
  const dominantType = evenPercent10 > oddPercent10 ? "EVEN" : "ODD"

  const calculateVolatility = () => {
    const change25to50 = Math.abs(evenPercent25 - evenPercent50)
    const change10to25 = Math.abs(evenPercent10 - evenPercent25)
    const change10to50 = Math.abs(evenPercent10 - evenPercent50)

    // Volatility is the rate of change across timeframes
    const volatilityScore = (change10to25 * 2 + change10to50) / 3

    return Math.min(volatilityScore * 2, 100)
  }

  const volatility = calculateVolatility()

  const hourTrendChange = Math.abs(evenPercent100 - evenPercent50)
  const recent15MinChange = Math.abs(evenPercent50 - evenPercent10)

  let signalStatus: "TRADE NOW" | "WAIT" | "NEUTRAL" = "NEUTRAL"
  let signalColor = "gray"
  let signalMessage = ""
  let signalDescription = ""

  const isMarketChanging = volatility > 40
  const isPowerIncreasing = (dominantType === "EVEN" && evenIncreasing) || (dominantType === "ODD" && oddIncreasing)

  // Market change detection overrides signals
  if (isMarketChanging && powerTrend === "decreasing") {
    signalStatus = "WAIT"
    signalColor = "red"
    signalMessage = "Market is changing - Power decreasing"
    signalDescription = "The dominant type's power is falling. Wait for stabilization."
  }
  // TRADE NOW signal at 56%+ and increasing
  else if (maxCurrent >= 56 && isPowerIncreasing) {
    signalStatus = "TRADE NOW"
    signalColor = "green"
    signalMessage = `${dominantType} at ${maxCurrent.toFixed(1)}% - POWERFUL SIGNAL`
    signalDescription = `${dominantType} power is at ${maxCurrent.toFixed(1)}% and INCREASING. Market momentum is strong!`
    if (tradeTimer === 0) setTradeTimer(120)
  }
  // WAIT signal at 50%+ and increasing
  else if (maxCurrent >= 50 && isPowerIncreasing) {
    signalStatus = "WAIT"
    signalColor = "blue"
    signalMessage = `${dominantType} at ${maxCurrent.toFixed(1)}% - Building Power`
    signalDescription = `${dominantType} power reaching threshold. Watch for confirmation to reach 56%+.`
  }
  // Power decreasing - revert to WAIT
  else if (maxCurrent >= 50 && !isPowerIncreasing) {
    signalStatus = "WAIT"
    signalColor = "orange"
    signalMessage = `Market shifting - ${dominantType} power decreasing`
    signalDescription = "Power was strong but is now decreasing. Market conditions changing."
  } else {
    signalStatus = "NEUTRAL"
    signalColor = "gray"
    signalMessage = "Analyzing market patterns"
    signalDescription = "Waiting for either EVEN or ODD to reach 50%+ with increasing power."
  }

  return (
    <div className="space-y-6">
      <div
        className={`rounded-xl p-4 border text-center ${
          theme === "dark"
            ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
            : "bg-white border-gray-200 shadow-lg"
        }`}
      >
        <div className={`text-sm mb-2 font-semibold ${theme === "dark" ? "text-gray-400" : "text-gray-700"}`}>
          Current Digit:
        </div>
        {currentDigit !== null ? (
          <div
            className={`text-4xl font-bold animate-pulse ${
              theme === "dark"
                ? "bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent"
                : "text-orange-600"
            }`}
          >
            {currentDigit}
          </div>
        ) : (
          <div className={`text-4xl font-bold ${theme === "dark" ? "text-gray-600" : "text-gray-400"}`}>-</div>
        )}
        <div className={`text-xl mt-2 font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          Price: {currentPrice?.toFixed(5) || "---"}
        </div>
      </div>

      <div
        className={`rounded-xl p-8 border ${
          theme === "dark"
            ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
            : "bg-white border-gray-200 shadow-lg"
        }`}
      >
        <div className="text-center mb-6">
          <h2 className={`text-3xl font-bold mb-3 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Even vs Odd Analysis
          </h2>
          <Badge
            className={`text-lg px-4 py-2 ${
              signalStatus === "TRADE NOW"
                ? theme === "dark"
                  ? "bg-green-500/20 text-green-400 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                  : "bg-green-100 text-green-700 border-green-300"
                : signalStatus === "WAIT"
                  ? theme === "dark"
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                    : "bg-blue-100 text-blue-700 border-blue-300"
                  : theme === "dark"
                    ? "bg-gray-500/20 text-gray-400 border-gray-500/30"
                    : "bg-gray-100 text-gray-600 border-gray-300"
            }`}
          >
            {signalStatus} {tradeTimer > 0 && `(${tradeTimer}s)`}
          </Badge>
        </div>

        <div
          className={`rounded-lg p-4 mb-6 ${
            signalStatus === "TRADE NOW"
              ? theme === "dark"
                ? "bg-green-500/10 border border-green-500/30"
                : "bg-green-50 border border-green-200"
              : signalStatus === "WAIT"
                ? theme === "dark"
                  ? "bg-blue-500/10 border border-blue-500/30"
                  : "bg-blue-50 border border-blue-200"
                : theme === "dark"
                  ? "bg-gray-500/10 border border-gray-500/30"
                  : "bg-gray-50 border border-gray-200"
          }`}
        >
          <h3 className={`text-lg font-bold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Signal Recommendation
          </h3>
          <p className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-800"}`}>
            {signalMessage}
          </p>
          <p className={`text-xs mt-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>{signalDescription}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div
            className={`rounded-lg p-6 border ${
              theme === "dark"
                ? "bg-blue-500/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className={`flex items-center justify-between mb-3`}>
              <div className={`text-5xl font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                {evenPercent10.toFixed(1)}%
              </div>
              <div className={`text-2xl ${evenIncreasing ? "text-green-500" : "text-red-500"}`}>
                {evenIncreasing ? "📈" : "📉"}
              </div>
            </div>
            <div className={`text-sm mb-4 font-semibold ${theme === "dark" ? "text-gray-400" : "text-gray-700"}`}>
              EVEN (Current Power)
            </div>

            <div className="space-y-2">
              <div>
                <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  Last 10 ticks
                </div>
                <div className={`w-full rounded-full h-4 ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}>
                  <div
                    className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                    style={{ width: `${Math.min(evenPercent10, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  Last 50 ticks
                </div>
                <div
                  className={`w-full rounded-full h-3 ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"} opacity-60`}
                >
                  <div
                    className="h-3 rounded-full bg-blue-500 transition-all opacity-70"
                    style={{ width: `${Math.min(evenPercent50, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  Last hour (100 ticks)
                </div>
                <div
                  className={`w-full rounded-full h-2 ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"} opacity-40`}
                >
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all opacity-50"
                    style={{ width: `${Math.min(evenPercent100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            className={`rounded-lg p-6 border ${
              theme === "dark"
                ? "bg-pink-500/10 border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.2)]"
                : "bg-pink-50 border-pink-200"
            }`}
          >
            <div className={`flex items-center justify-between mb-3`}>
              <div className={`text-5xl font-bold ${theme === "dark" ? "text-pink-400" : "text-pink-600"}`}>
                {oddPercent10.toFixed(1)}%
              </div>
              <div className={`text-2xl ${oddIncreasing ? "text-green-500" : "text-red-500"}`}>
                {oddIncreasing ? "📈" : "📉"}
              </div>
            </div>
            <div className={`text-sm mb-4 font-semibold ${theme === "dark" ? "text-gray-400" : "text-gray-700"}`}>
              ODD (Current Power)
            </div>

            <div className="space-y-2">
              <div>
                <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  Last 10 ticks
                </div>
                <div className={`w-full rounded-full h-4 ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}>
                  <div
                    className="h-4 rounded-full bg-gradient-to-r from-pink-500 to-red-500 transition-all"
                    style={{ width: `${Math.min(oddPercent10, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  Last 50 ticks
                </div>
                <div
                  className={`w-full rounded-full h-3 ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"} opacity-60`}
                >
                  <div
                    className="h-3 rounded-full bg-pink-500 transition-all opacity-70"
                    style={{ width: `${Math.min(oddPercent50, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  Last hour (100 ticks)
                </div>
                <div
                  className={`w-full rounded-full h-2 ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"} opacity-40`}
                >
                  <div
                    className="h-2 rounded-full bg-pink-500 transition-all opacity-50"
                    style={{ width: `${Math.min(oddPercent100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div
            className={`p-4 rounded-lg text-center ${
              theme === "dark"
                ? "bg-purple-500/10 border border-purple-500/30"
                : "bg-purple-50 border border-purple-200"
            }`}
          >
            <div className={`text-sm mb-1 font-semibold ${theme === "dark" ? "text-gray-400" : "text-gray-700"}`}>
              Market Volatility
            </div>
            <div className={`text-2xl font-bold ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`}>
              {volatility.toFixed(1)}%
            </div>
            <div className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              {volatility > 50 ? "High" : volatility > 25 ? "Medium" : "Low"}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg text-center ${
              theme === "dark" ? "bg-cyan-500/10 border border-cyan-500/30" : "bg-cyan-50 border border-cyan-200"
            }`}
          >
            <div className={`text-sm mb-1 font-semibold ${theme === "dark" ? "text-gray-400" : "text-gray-700"}`}>
              Power Trend
            </div>
            <div className={`text-2xl font-bold ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>
              {powerTrend === "increasing" ? "📈" : powerTrend === "decreasing" ? "📉" : "→"}
            </div>
            <div className={`text-xs mt-1 capitalize ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              {powerTrend}
            </div>
          </div>

          <div
            className={`p-4 rounded-lg text-center ${
              theme === "dark" ? "bg-green-500/10 border border-green-500/30" : "bg-green-50 border border-green-200"
            }`}
          >
            <div className={`text-sm mb-1 font-semibold ${theme === "dark" ? "text-gray-400" : "text-gray-700"}`}>
              1H Change
            </div>
            <div className={`text-2xl font-bold ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
              {hourTrendChange.toFixed(1)}%
            </div>
            <div className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Last 100 ticks</div>
          </div>

          <div
            className={`p-4 rounded-lg text-center ${
              theme === "dark"
                ? "bg-orange-500/10 border border-orange-500/30"
                : "bg-orange-50 border border-orange-200"
            }`}
          >
            <div className={`text-sm mb-1 font-semibold ${theme === "dark" ? "text-gray-400" : "text-gray-700"}`}>
              Recent Change
            </div>
            <div className={`text-2xl font-bold ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`}>
              {recent15MinChange.toFixed(1)}%
            </div>
            <div className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Last 10 ticks</div>
          </div>
        </div>

        {signalStatus === "TRADE NOW" ? (
          <Button
            size="lg"
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-8 py-6 text-xl font-bold shadow-[0_0_30px_rgba(34,197,94,0.7)] animate-pulse mb-4"
          >
            TRADE {dominantType} NOW - {maxCurrent.toFixed(1)}%
          </Button>
        ) : null}
      </div>

      {safeRecentDigits.length > 0 && (
        <div
          className={`rounded-xl p-6 border ${
            theme === "dark"
              ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
              : "bg-white border-gray-200 shadow-lg"
          }`}
        >
          <h3 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Last 40 Digits
          </h3>
          <LastDigitsDisplay digits={safeRecentDigits} currentDigit={currentDigit} mode="even-odd" theme={theme} />
        </div>
      )}
    </div>
  )
}
