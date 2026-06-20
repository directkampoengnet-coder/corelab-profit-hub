"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface StatsAnalysisProps {
  last15Digits: number[]
  theme?: "light" | "dark"
  showDetailedStats?: boolean
}

export function StatsAnalysis({ last15Digits, theme = "dark", showDetailedStats = true }: StatsAnalysisProps) {
  const safeDigits = Array.isArray(last15Digits) ? last15Digits : []

  if (safeDigits.length === 0) {
    return (
      <Card className={theme === "dark" ? "bg-[#0f1629]/80 border-cyan-500/20" : "bg-white border-gray-200"}>
        <CardHeader>
          <CardTitle className={theme === "dark" ? "text-cyan-400" : "text-cyan-600"}>Statistical Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">Waiting for tick data to analyze...</p>
        </CardContent>
      </Card>
    )
  }

  const evenDigits = safeDigits.filter((d) => d % 2 === 0)
  const oddDigits = safeDigits.filter((d) => d % 2 !== 0)
  const underDigits = safeDigits.filter((d) => d < 5)
  const overDigits = safeDigits.filter((d) => d >= 5)

  // Additional groupings
  const under3Digits = safeDigits.filter((d) => d < 3)
  const over6Digits = safeDigits.filter((d) => d > 6)
  const under7Digits = safeDigits.filter((d) => d <= 6)
  const over2Digits = safeDigits.filter((d) => d >= 3)

  const total = safeDigits.length
  const evenPercent = (evenDigits.length / total) * 100
  const oddPercent = (oddDigits.length / total) * 100
  const underPercent = (underDigits.length / total) * 100
  const overPercent = (overDigits.length / total) * 100

  // Calculate differs (digits appearing rarely)
  const digitCounts: Record<number, number> = {}
  safeDigits.forEach((d) => {
    digitCounts[d] = (digitCounts[d] || 0) + 1
  })
  const differsDigits = Object.entries(digitCounts)
    .filter(([_, count]) => count <= 1)
    .map(([digit]) => Number(digit))

  // Determine bias with thresholds for trading signals
  let bias = "Neutral"
  let biasColor = "text-gray-400"
  let recommendation = ""

  if (evenPercent >= 60) {
    bias = "Even Dominant"
    biasColor = "text-green-400"
    recommendation = "Consider DIGITEVEN contracts"
  } else if (oddPercent >= 60) {
    bias = "Odd Dominant"
    biasColor = "text-blue-400"
    recommendation = "Consider DIGITODD contracts"
  } else if (underPercent >= 60) {
    bias = "Under Dominant"
    biasColor = "text-purple-400"
    recommendation = "Consider DIGITUNDER contracts"
  } else if (overPercent >= 60) {
    bias = "Over Dominant"
    biasColor = "text-orange-400"
    recommendation = "Consider DIGITOVER contracts"
  } else if (evenPercent > 55 || oddPercent > 55) {
    bias = evenPercent > oddPercent ? "Even Bias" : "Odd Bias"
    biasColor = "text-yellow-400"
    recommendation = "WAIT - Signal forming"
  }

  return (
    <Card className={theme === "dark" ? "bg-[#0f1629]/80 border-cyan-500/20" : "bg-white border-gray-200"}>
      <CardHeader>
        <CardTitle className={theme === "dark" ? "text-cyan-400" : "text-cyan-600"}>
          Statistical Analysis ({total} Ticks)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Last 15 Digits Display */}
        <div>
          <p className="text-xs text-gray-400 mb-2">Last 15 Digits</p>
          <div className="flex gap-1 flex-wrap">
            {safeDigits.map((digit, idx) => (
              <div
                key={idx}
                className={`w-10 h-10 rounded flex items-center justify-center text-sm font-bold ${
                  idx === safeDigits.length - 1
                    ? "bg-yellow-500 text-black ring-2 ring-yellow-300 scale-110"
                    : digit % 2 === 0
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                }`}
              >
                {digit}
              </div>
            ))}
          </div>
        </div>

        {/* Market Bias */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Market Bias</p>
              <p className={`text-2xl font-bold ${biasColor}`}>{bias}</p>
              {recommendation && <p className="text-xs text-gray-400 mt-1">{recommendation}</p>}
            </div>
            {evenPercent > 55 && <TrendingUp className="w-8 h-8 text-green-400" />}
            {oddPercent > 55 && <TrendingDown className="w-8 h-8 text-blue-400" />}
            {Math.abs(evenPercent - oddPercent) < 10 && <Minus className="w-8 h-8 text-gray-400" />}
          </div>
        </div>

        {/* Primary Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-xs text-gray-400">Even</p>
            <p className="text-2xl font-bold text-green-400">{evenDigits.length}</p>
            <p className="text-xs text-green-400">{evenPercent.toFixed(1)}%</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-xs text-gray-400">Odd</p>
            <p className="text-2xl font-bold text-blue-400">{oddDigits.length}</p>
            <p className="text-xs text-blue-400">{oddPercent.toFixed(1)}%</p>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
            <p className="text-xs text-gray-400">Under 5 (0-4)</p>
            <p className="text-2xl font-bold text-purple-400">{underDigits.length}</p>
            <p className="text-xs text-purple-400">{underPercent.toFixed(1)}%</p>
          </div>
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <p className="text-xs text-gray-400">Over 4 (5-9)</p>
            <p className="text-2xl font-bold text-orange-400">{overDigits.length}</p>
            <p className="text-xs text-orange-400">{overPercent.toFixed(1)}%</p>
          </div>
        </div>

        {/* Detailed Statistics */}
        {showDetailedStats && (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 font-semibold">Advanced Analysis</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded bg-gray-800/50">
                <p className="text-gray-500">Under 3</p>
                <p className="text-white font-bold">
                  {under3Digits.length} ({((under3Digits.length / total) * 100).toFixed(0)}%)
                </p>
              </div>
              <div className="p-2 rounded bg-gray-800/50">
                <p className="text-gray-500">Over 6</p>
                <p className="text-white font-bold">
                  {over6Digits.length} ({((over6Digits.length / total) * 100).toFixed(0)}%)
                </p>
              </div>
              <div className="p-2 rounded bg-gray-800/50">
                <p className="text-gray-500">Differs</p>
                <p className="text-white font-bold">{differsDigits.length}</p>
              </div>
            </div>

            {/* Digit Frequency */}
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-2">Digit Frequency</p>
              <div className="flex gap-1 justify-between">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
                  const count = digitCounts[digit] || 0
                  const percent = (count / total) * 100
                  return (
                    <div key={digit} className="flex flex-col items-center">
                      <div
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                          count === 0
                            ? "bg-gray-700 text-gray-500"
                            : percent > 15
                              ? "bg-red-500 text-white"
                              : percent > 10
                                ? "bg-orange-500 text-white"
                                : "bg-blue-500/30 text-blue-400"
                        }`}
                      >
                        {digit}
                      </div>
                      <span className="text-xs text-gray-500 mt-1">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Trading Signals */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30">
          <p className="text-xs text-gray-400 mb-2">Trading Signals</p>
          <div className="space-y-1 text-xs">
            {evenPercent >= 60 && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">EVEN SIGNAL STRONG</Badge>
            )}
            {oddPercent >= 60 && (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">ODD SIGNAL STRONG</Badge>
            )}
            {underPercent >= 60 && (
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">UNDER SIGNAL STRONG</Badge>
            )}
            {overPercent >= 60 && (
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">OVER SIGNAL STRONG</Badge>
            )}
            {evenPercent > 55 && evenPercent < 60 && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">EVEN FORMING</Badge>
            )}
            {oddPercent > 55 && oddPercent < 60 && (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">ODD FORMING</Badge>
            )}
            {Math.abs(evenPercent - oddPercent) < 10 && Math.abs(underPercent - overPercent) < 10 && (
              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">WAIT - NEUTRAL MARKET</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
