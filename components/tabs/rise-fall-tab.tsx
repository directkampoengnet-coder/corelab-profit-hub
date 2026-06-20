"use client"

import { Button } from "@/components/ui/button"
import { Last40Digits } from "@/components/last-40-digits"
import type { Signal, AnalysisResult } from "@/lib/analysis-engine"

interface RiseFallTabProps {
  analysis: AnalysisResult | null
  signals: Signal[]
  currentPrice: number | null
  recentDigits: number[]
  theme?: "light" | "dark"
}

export function RiseFallTab({ analysis, signals, currentPrice, recentDigits, theme = "dark" }: RiseFallTabProps) {
  const riseFallSignal = signals?.find((s) => s.type === "rise_fall")

  const safeRecentDigits = recentDigits && Array.isArray(recentDigits) ? recentDigits : []

  if (!analysis) {
    return (
      <div className="text-center py-16">
        <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Loading analysis...</p>
      </div>
    )
  }

  // Calculate rise/fall stats using safe array
  const riseCount = safeRecentDigits.filter((d, i) => i > 0 && d > safeRecentDigits[i - 1]).length
  const fallCount = safeRecentDigits.filter((d, i) => i > 0 && d < safeRecentDigits[i - 1]).length
  const total = riseCount + fallCount
  const risePercentage = total > 0 ? (riseCount / total) * 100 : 0
  const fallPercentage = total > 0 ? (fallCount / total) * 100 : 0

  const marketDirection = risePercentage > fallPercentage ? "RISE" : "FALL"
  const marketPower = Math.max(risePercentage, fallPercentage)

  return (
    <div className="space-y-6">
      <div
        className={`rounded-xl p-4 sm:p-6 md:p-8 border ${
          theme === "dark"
            ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
            : "bg-white border-gray-200 shadow-lg"
        }`}
      >
        <h2
          className={`text-2xl sm:text-3xl font-bold mb-6 text-center ${theme === "dark" ? "text-white" : "text-gray-900"}`}
        >
          Rise / Fall Analysis
        </h2>

        <div className="mb-8 text-center">
          <div className="text-sm text-gray-400 mb-2">Market Direction</div>
          <div
            className={`text-4xl sm:text-5xl font-bold mb-2 ${
              marketDirection === "RISE" ? "text-green-400" : "text-red-400"
            }`}
          >
            {marketDirection}
          </div>
          <div className="text-sm text-gray-400 mb-1">Market Power</div>
          <div className="text-3xl sm:text-4xl font-bold text-blue-400">{marketPower.toFixed(1)}%</div>
        </div>

        <div className="space-y-6 mb-8">
          {/* Rise Power */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold text-sm sm:text-base">Rise Power</span>
              <span className="text-green-400 font-bold text-lg sm:text-xl">{risePercentage.toFixed(1)}%</span>
            </div>
            <div className="h-4 sm:h-6 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${risePercentage}%` }}
              >
                <span className="text-white text-xs font-bold">{riseCount}</span>
              </div>
            </div>
          </div>

          {/* Fall Power */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold text-sm sm:text-base">Fall Power</span>
              <span className="text-red-400 font-bold text-lg sm:text-xl">{fallPercentage.toFixed(1)}%</span>
            </div>
            <div className="h-4 sm:h-6 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-pink-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${fallPercentage}%` }}
              >
                <span className="text-white text-xs font-bold">{fallCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            size="lg"
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 sm:py-6 text-base sm:text-lg font-bold shadow-[0_0_25px_rgba(34,197,94,0.5)]"
          >
            R - RISE
          </Button>
          <Button
            size="lg"
            className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white py-4 sm:py-6 text-base sm:text-lg font-bold shadow-[0_0_25px_rgba(239,68,68,0.5)]"
          >
            F - FALL
          </Button>
        </div>
      </div>

      {safeRecentDigits.length > 0 && (
        <div
          className={`rounded-xl p-4 sm:p-6 border ${
            theme === "dark"
              ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
              : "bg-white border-gray-200 shadow-lg"
          }`}
        >
          <h3 className={`text-base sm:text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Last 40 Digits
          </h3>
          <Last40Digits digits={safeRecentDigits} theme={theme} mode="rise-fall" />
        </div>
      )}
    </div>
  )
}
