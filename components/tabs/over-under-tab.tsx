"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LastDigitsChart } from "@/components/charts/last-digits-chart"
import { LastDigitsLineChart } from "@/components/charts/last-digits-line-chart"
import { OverUnderAnalyzer } from "@/components/over-under-analyzer"
import type { Signal, AnalysisResult } from "@/lib/analysis-engine"

interface OverUnderTabProps {
  analysis: AnalysisResult | null
  signals: Signal[]
  currentDigit: number | null
  currentPrice: number | null
  recentDigits: number[]
  theme?: "light" | "dark"
}

export function OverUnderTab({
  analysis,
  signals,
  currentDigit,
  currentPrice,
  recentDigits,
  theme = "dark",
}: OverUnderTabProps) {
  const [selectedDigit, setSelectedDigit] = useState<number>(4)
  const [tradeTimer, setTradeTimer] = useState<number>(0)
  const [marketChangeReason, setMarketChangeReason] = useState<string>("")
  const [maxPercentage, setMaxPercentage] = useState<number>(0)
  const [favored, setFavored] = useState<string>("")

  const safeRecentDigits = recentDigits && Array.isArray(recentDigits) ? recentDigits : []

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
    const prevMaxPercentage = maxPercentage
    if (prevMaxPercentage >= 60 && maxPercentage < 60) {
      setMarketChangeReason("Market momentum shifted - Strong bias dropped below 60% threshold")
    } else if (prevMaxPercentage >= 55 && maxPercentage < 50) {
      setMarketChangeReason("Market reversed direction - Trend completely changed")
    }
  }, [maxPercentage])

  useEffect(() => {
    const underCount = safeRecentDigits.filter((d) => d >= 0 && d <= 4).length
    const overCount = safeRecentDigits.filter((d) => d >= 5 && d <= 9).length
    const underPercent = safeRecentDigits.length > 0 ? (underCount / safeRecentDigits.length) * 100 : 50
    const overPercent = safeRecentDigits.length > 0 ? (overCount / safeRecentDigits.length) * 100 : 50

    const newFavored = underPercent > overPercent ? "under" : "over"
    const newMaxPercentage = Math.max(underPercent, overPercent)

    setMaxPercentage(newMaxPercentage)
    setFavored(newFavored)
  }, [safeRecentDigits])

  if (!analysis || safeRecentDigits.length === 0) {
    return (
      <div className="text-center py-16">
        <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Loading analysis...</p>
      </div>
    )
  }

  const last20Digits = safeRecentDigits.slice(-20)
  const analysisDigits = safeRecentDigits // Use all available digits for analysis

  const calculateStreak = (digits: number[]) => {
    if (digits.length === 0) return { type: "none", count: 0 }

    const streakType = digits[digits.length - 1] >= 5 ? "over" : "under"
    let count = 1

    for (let i = digits.length - 2; i >= 0; i--) {
      const currentType = digits[i] >= 5 ? "over" : "under"
      if (currentType === streakType) {
        count++
      } else {
        break
      }
    }

    return { type: streakType, count }
  }

  const calculateDigitPower = (digit: number) => {
    const digitOccurrences = analysisDigits.filter((d) => d === digit).length
    const frequency = analysisDigits.length > 0 ? (digitOccurrences / analysisDigits.length) * 100 : 0

    const momentumSampleSize = Math.max(10, Math.floor(analysisDigits.length * 0.1))
    const recentSample = analysisDigits.slice(-momentumSampleSize)
    const recentOccurrences = recentSample.filter((d) => d === digit).length
    const momentum = (recentOccurrences / recentSample.length) * 100

    const confidence = frequency * 0.6 + momentum * 0.4

    let strength: "VERY STRONG" | "STRONG" | "MODERATE" | "WEAK" = "WEAK"
    if (confidence >= 25) strength = "VERY STRONG"
    else if (confidence >= 15) strength = "STRONG"
    else if (confidence >= 10) strength = "MODERATE"

    return {
      digit,
      frequency: frequency.toFixed(1),
      momentum: momentum.toFixed(1),
      confidence: confidence.toFixed(1),
      strength,
      occurrences: digitOccurrences,
      recentOccurrences,
    }
  }

  const digitPower = calculateDigitPower(selectedDigit)

  const streak = calculateStreak(analysisDigits)

  const calculateUnderOverStats = () => {
    const underDigits = safeRecentDigits.filter((d) => d >= 0 && d <= 4)
    const overDigits = safeRecentDigits.filter((d) => d >= 5 && d <= 9)

    const underCounts = [0, 1, 2, 3, 4].map((digit) => ({
      digit,
      count: underDigits.filter((d) => d === digit).length,
    }))
    const overCounts = [5, 6, 7, 8, 9].map((digit) => ({
      digit,
      count: overDigits.filter((d) => d === digit).length,
    }))

    const highestUnder = underCounts.reduce((max, curr) => (curr.count > max.count ? curr : max), underCounts[0])
    const highestOver = overCounts.reduce((max, curr) => (curr.count > max.count ? curr : max), overCounts[0])

    const underCount = underDigits.length
    const overCount = overDigits.length
    const underPercent = safeRecentDigits.length > 0 ? (underCount / safeRecentDigits.length) * 100 : 50
    const overPercent = safeRecentDigits.length > 0 ? (overCount / safeRecentDigits.length) * 100 : 50

    return { underPercent, overPercent, highestUnder, highestOver }
  }

  const { underPercent, overPercent, highestUnder, highestOver } = calculateUnderOverStats()

  let signalStatus: "TRADE NOW" | "WAIT" | "NEUTRAL" = "NEUTRAL"
  let signalMessage = ""
  let entryPoint = ""

  if (maxPercentage >= 70) {
    signalStatus = "TRADE NOW"
    const favoredDigit = favored === "under" ? highestUnder.digit : highestOver.digit
    signalMessage = `VERY STRONG ${favored.toUpperCase()} signal at ${maxPercentage.toFixed(1)}% (Digit ${favoredDigit} leading)`
    entryPoint = `Enter ${favored.toUpperCase()} position at price ${currentPrice?.toFixed(5) || "---"} targeting digit ${favoredDigit}`
    if (tradeTimer === 0) setTradeTimer(60)
  } else if (maxPercentage >= 60) {
    signalStatus = "TRADE NOW"
    const favoredDigit = favored === "under" ? highestUnder.digit : highestOver.digit
    signalMessage = `STRONG ${favored.toUpperCase()} signal at ${maxPercentage.toFixed(1)}% (Digit ${favoredDigit} leading)`
    entryPoint = `Enter ${favored.toUpperCase()} position at price ${currentPrice?.toFixed(5) || "---"} targeting digit ${favoredDigit}`
    if (tradeTimer === 0) setTradeTimer(60)
  } else if (maxPercentage >= 55) {
    signalStatus = "WAIT"
    signalMessage = `Building ${favored.toUpperCase()} bias at ${maxPercentage.toFixed(1)}% - Wait for stronger confirmation`
  } else {
    signalMessage = "Market is balanced - No clear signal yet"
  }

  return (
    <div className="space-y-6">
      <OverUnderAnalyzer ticks={analysisDigits} currentPrice={currentPrice} theme={theme} />

      <div
        className={`rounded-xl p-6 border ${
          theme === "dark"
            ? "bg-gradient-to-br from-[#0a0e27] to-[#0f1535] border-blue-500/20"
            : "bg-white border-gray-200"
        }`}
      >
        <h3 className={`text-xl font-bold mb-4 text-center ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          Under (0-4) / Over (5-9) Analysis
        </h3>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-blue-900/30" : "bg-blue-50"}`}>
            <div className={`text-lg font-bold mb-2 ${theme === "dark" ? "text-blue-300" : "text-blue-800"}`}>
              Under (0-4)
            </div>
            <div className={`text-4xl font-bold mb-2 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>
              {underPercent.toFixed(1)}%
            </div>
            <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Highest: Digit {highestUnder.digit} ({highestUnder.count}x)
            </div>
          </div>

          <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-green-900/30" : "bg-green-50"}`}>
            <div className={`text-lg font-bold mb-2 ${theme === "dark" ? "text-green-300" : "text-green-800"}`}>
              Over (5-9)
            </div>
            <div className={`text-4xl font-bold mb-2 ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
              {overPercent.toFixed(1)}%
            </div>
            <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Highest: Digit {highestOver.digit} ({highestOver.count}x)
            </div>
          </div>
        </div>
      </div>

      <div
        className={`rounded-xl p-6 border ${
          theme === "dark"
            ? "bg-gradient-to-br from-[#0a0e27] to-[#0f1535] border-blue-500/20"
            : "bg-white border-gray-200"
        }`}
      >
        <h3 className={`text-xl font-bold mb-4 text-center ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          Select Digit for Over/Under Analysis
        </h3>

        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              onClick={() => setSelectedDigit(digit)}
              className={`w-12 h-12 rounded-lg font-bold text-lg transition-all ${
                selectedDigit === digit
                  ? theme === "dark"
                    ? "bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-[0_0_20px_rgba(234,179,8,0.6)] scale-110 border-2 border-yellow-400"
                    : "bg-yellow-500 text-white shadow-lg scale-110"
                  : theme === "dark"
                    ? "bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-700/50 hover:text-gray-200"
                    : "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
              }`}
            >
              {digit}
            </button>
          ))}
        </div>

        <div
          className={`mb-6 p-5 rounded-xl border ${
            theme === "dark"
              ? "bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30"
              : "bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200"
          }`}
        >
          <h4
            className={`text-lg font-bold mb-4 text-center ${theme === "dark" ? "text-purple-300" : "text-purple-800"}`}
          >
            Digit {selectedDigit} Prediction Power
          </h4>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-800/50" : "bg-white"}`}>
              <div className={`text-xs font-semibold mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Frequency (Last {analysisDigits.length})
              </div>
              <div className={`text-2xl font-bold ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>
                {digitPower.frequency}%
              </div>
              <div className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-600"}`}>
                {digitPower.occurrences} times
              </div>
            </div>

            <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-800/50" : "bg-white"}`}>
              <div className={`text-xs font-semibold mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Momentum (Last {Math.max(10, Math.floor(analysisDigits.length * 0.1))})
              </div>
              <div className={`text-2xl font-bold ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
                {digitPower.momentum}%
              </div>
              <div className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-600"}`}>
                {digitPower.recentOccurrences} recent
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-semibold ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Prediction Confidence
              </span>
              <Badge
                className={`
                ${digitPower.strength === "VERY STRONG" ? "bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] animate-pulse" : ""}
                ${digitPower.strength === "STRONG" ? "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]" : ""}
                ${digitPower.strength === "MODERATE" ? "bg-yellow-500" : ""}
                ${digitPower.strength === "WEAK" ? "bg-gray-500" : ""}
                text-white font-bold
              `}
              >
                {digitPower.strength}
              </Badge>
            </div>

            <div className={`w-full rounded-full h-3 ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`}>
              <div
                className={`h-3 rounded-full transition-all ${
                  digitPower.strength === "VERY STRONG"
                    ? "bg-gradient-to-r from-green-600 to-green-400"
                    : digitPower.strength === "STRONG"
                      ? "bg-gradient-to-r from-blue-600 to-blue-400"
                      : digitPower.strength === "MODERATE"
                        ? "bg-gradient-to-r from-yellow-600 to-yellow-400"
                        : "bg-gradient-to-r from-gray-600 to-gray-400"
                }`}
                style={{ width: `${Math.min(Number.parseFloat(digitPower.confidence), 100)}%` }}
              />
            </div>
            <div className="text-center">
              <span className={`text-xl font-bold ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`}>
                {digitPower.confidence}% Confidence
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className={`text-sm font-semibold w-32 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              Over ({selectedDigit + 1}-9)
            </div>
            <div className="flex-1 relative">
              <div className={`w-full rounded-full h-8 ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`}>
                <div
                  className={`h-8 rounded-full transition-all ${
                    theme === "dark"
                      ? "bg-gradient-to-r from-green-600 to-green-500"
                      : "bg-gradient-to-r from-green-500 to-green-400"
                  }`}
                  style={{ width: `${Math.min(overPercent, 100)}%` }}
                />
              </div>
            </div>
            <div
              className={`text-xl font-bold w-20 text-right ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}
            >
              {overPercent.toFixed(1)}%
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`text-sm font-semibold w-32 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              Under (0-{selectedDigit - 1})
            </div>
            <div className="flex-1 relative">
              <div className={`w-full rounded-full h-8 ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`}>
                <div
                  className={`h-8 rounded-full transition-all ${
                    theme === "dark"
                      ? "bg-gradient-to-r from-blue-600 to-cyan-500"
                      : "bg-gradient-to-r from-blue-500 to-cyan-400"
                  }`}
                  style={{ width: `${Math.min(underPercent, 100)}%` }}
                />
              </div>
            </div>
            <div
              className={`text-xl font-bold w-20 text-right ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}
            >
              {underPercent.toFixed(1)}%
            </div>
          </div>

          {digitPower.digit === selectedDigit && (
            <div className={`text-center mt-2 p-2 rounded ${theme === "dark" ? "bg-orange-900/30" : "bg-orange-50"}`}>
              <span className={`text-sm font-semibold ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`}>
                Digit {selectedDigit} appeared {digitPower.occurrences} times ({digitPower.frequency}%)
              </span>
            </div>
          )}
        </div>

        <div className="mt-6">
          <h4 className={`text-sm font-bold mb-3 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-700"}`}>
            Last {analysisDigits.length} Digits (U = Under, O = Over, C = Current Digit {selectedDigit})
          </h4>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {analysisDigits.map((digit, idx) => {
              const isCurrentDigit = digit === selectedDigit
              const isOver = digit > selectedDigit
              const isUnder = digit < selectedDigit

              return (
                <div
                  key={idx}
                  className={`w-10 h-10 rounded flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrentDigit
                      ? "bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.6)] scale-110"
                      : isOver
                        ? "bg-green-500 text-white"
                        : "bg-red-500 text-white"
                  }`}
                >
                  {isCurrentDigit ? "C" : isOver ? "O" : "U"}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div
        className={`rounded-xl p-6 border text-center ${
          signalStatus === "TRADE NOW"
            ? theme === "dark"
              ? "bg-gradient-to-br from-green-900/30 to-green-800/30 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.4)]"
              : "bg-green-50 border-green-300 shadow-lg"
            : signalStatus === "WAIT"
              ? theme === "dark"
                ? "bg-gradient-to-br from-blue-900/30 to-blue-800/30 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.4)]"
                : "bg-blue-50 border-blue-300 shadow-lg"
              : theme === "dark"
                ? "bg-gradient-to-br from-gray-900/30 to-gray-800/30 border-gray-500/30"
                : "bg-gray-50 border-gray-300"
        }`}
      >
        <Badge
          className={`text-xl px-6 py-3 font-bold mb-4 ${
            signalStatus === "TRADE NOW"
              ? "bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.6)] animate-pulse"
              : signalStatus === "WAIT"
                ? "bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.6)] animate-pulse"
                : "bg-gray-500 text-white"
          }`}
        >
          {signalStatus} {tradeTimer > 0 && `(${tradeTimer}s)`}
        </Badge>
        <p className={`text-base font-semibold mb-2 ${theme === "dark" ? "text-gray-200" : "text-gray-800"}`}>
          {signalMessage}
        </p>
        {entryPoint && (
          <p className={`text-sm font-bold ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`}>
            📍 {entryPoint}
          </p>
        )}
        {marketChangeReason && (
          <div
            className={`mt-4 p-3 rounded-lg ${theme === "dark" ? "bg-red-900/30 border border-red-500/50" : "bg-red-50 border border-red-300"}`}
          >
            <p className={`text-sm font-semibold ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
              ⚠️ Market Change: {marketChangeReason}
            </p>
          </div>
        )}
      </div>

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
        <div
          className={`text-4xl font-bold animate-pulse ${
            theme === "dark"
              ? "bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent"
              : "text-orange-600"
          }`}
        >
          {currentDigit !== null ? currentDigit : "0"}
        </div>
        <div className={`text-xl mt-2 font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          Price: {currentPrice?.toFixed(5) || "---"}
        </div>
      </div>

      {last20Digits.length > 0 && (
        <div
          className={`rounded-xl p-6 border ${
            theme === "dark"
              ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
              : "bg-white border-gray-200 shadow-lg"
          }`}
        >
          <h3 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Last 20 Digits
          </h3>
          <LastDigitsChart digits={last20Digits} />
        </div>
      )}

      {last20Digits.length > 0 && (
        <div
          className={`rounded-xl p-6 border ${
            theme === "dark"
              ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
              : "bg-white border-gray-200 shadow-lg"
          }`}
        >
          <h3 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Digits Line Chart
          </h3>
          <LastDigitsLineChart digits={last20Digits} />
        </div>
      )}

      {signalStatus === "TRADE NOW" && (
        <Button
          size="lg"
          className={`w-full px-8 py-6 text-xl font-bold text-white ${
            favored === "under"
              ? "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-[0_0_30px_rgba(59,130,246,0.7)]"
              : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-[0_0_30px_rgba(34,197,94,0.7)]"
          } animate-pulse`}
        >
          TRADE NOW {favored.toUpperCase()}
        </Button>
      )}
    </div>
  )
}
