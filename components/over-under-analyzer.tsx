"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface OverUnderAnalyzerProps {
  ticks: number[]
  currentPrice: number | null
  theme?: "light" | "dark"
}

export function OverUnderAnalyzer({ ticks, currentPrice, theme = "dark" }: OverUnderAnalyzerProps) {
  const [previousOverPct, setPreviousOverPct] = useState<number>(50)
  const [previousUnderPct, setPreviousUnderPct] = useState<number>(50)

  const underCount = ticks.filter((d) => d >= 0 && d <= 4).length
  const overCount = ticks.filter((d) => d >= 5 && d <= 9).length
  const total = ticks.length || 1

  const underPct = (underCount / total) * 100
  const overPct = (overCount / total) * 100

  const marketPower = Math.max(underPct, overPct)
  const dominantSide = overPct > underPct ? "OVER" : "UNDER"

  const overTrend = overPct > previousOverPct ? "↑" : overPct < previousOverPct ? "↓" : "→"
  const underTrend = underPct > previousUnderPct ? "↑" : underPct < previousUnderPct ? "↓" : "→"

  useEffect(() => {
    setPreviousOverPct(overPct)
    setPreviousUnderPct(underPct)
  }, [overPct, underPct])

  let signal: "WAIT" | "TRADE" | "STRONG" = "WAIT"
  let signalColor = "orange"
  let signalMessage = ""

  if (marketPower >= 60) {
    signal = "STRONG"
    signalColor = dominantSide === "OVER" ? "green" : "blue"
    signalMessage = `STRONG ${dominantSide} signal at ${marketPower.toFixed(1)}% - POWERFUL market!`
  } else if (marketPower >= 56 && (overTrend === "↑" || underTrend === "↑")) {
    signal = "TRADE"
    signalColor = dominantSide === "OVER" ? "green" : "blue"
    signalMessage = `TRADE NOW (${dominantSide}) – Market gaining direction`
  } else if (marketPower >= 53) {
    signal = "WAIT"
    signalColor = "orange"
    signalMessage = `WAIT – Market building trend at ${marketPower.toFixed(1)}%...`
  } else {
    signal = "WAIT"
    signalColor = "gray"
    signalMessage = "Market is balanced - wait for clearer direction"
  }

  let prediction = ""
  let entryPoint = ""

  if (dominantSide === "UNDER") {
    const digits0to6 = ticks.filter((d) => d >= 0 && d <= 6).length
    const digits0to5 = ticks.filter((d) => d >= 0 && d <= 5).length
    const digits0to4 = ticks.filter((d) => d >= 0 && d <= 4).length

    const mostFrequentUnder = [...Array(5)]
      .map((_, i) => i)
      .sort((a, b) => ticks.filter((d) => d === b).length - ticks.filter((d) => d === a).length)[0]

    if (digits0to6 / total > 0.6) {
      prediction = "Under 8, Under 9"
    } else if (digits0to5 / total > 0.6) {
      prediction = "Under 7"
    } else if (digits0to4 / total > 0.6) {
      prediction = "Under 6"
    } else if (digits0to5 / total > 0.55) {
      prediction = "Under 6, 7, 8"
    }

    entryPoint = `Highest in Under (digit ${mostFrequentUnder})`
  } else {
    const digits3to9 = ticks.filter((d) => d >= 3 && d <= 9).length
    const digits4to9 = ticks.filter((d) => d >= 4 && d <= 9).length
    const digits5to9 = ticks.filter((d) => d >= 5 && d <= 9).length

    const mostFrequentOver = [...Array(5)]
      .map((_, i) => i + 5)
      .sort((a, b) => ticks.filter((d) => d === b).length - ticks.filter((d) => d === a).length)[0]

    if (digits3to9 / total > 0.6) {
      prediction = "Over 1, Over 0"
    } else if (digits4to9 / total > 0.6) {
      prediction = "Over 2"
    } else if (digits4to9 / total > 0.55) {
      prediction = "Over 3, 2, 1"
    } else if (digits5to9 / total > 0.6) {
      prediction = "Over 3"
    }

    entryPoint = `Highest in Over (digit ${mostFrequentOver})`
  }

  const volatility =
    ticks.length > 1
      ? ticks.slice(1).reduce((sum, val, i) => sum + Math.abs(val - ticks[i]), 0) / (ticks.length - 1)
      : 0

  const changeRate =
    ticks.length > 10
      ? Math.abs(overPct - (ticks.slice(0, -10).filter((d) => d >= 5 && d <= 9).length / (ticks.length - 10)) * 100)
      : 0

  return (
    <div className="space-y-6">
      {/* Top Section with Title and Trade Button */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          Under (0–4) / Over (5–9) Analysis (Last {ticks.length} Ticks)
        </h2>
        {signal === "TRADE" || signal === "STRONG" ? (
          <Button
            size="lg"
            className={`px-8 py-4 text-lg font-bold text-white animate-pulse ${
              signalColor === "green"
                ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-[0_0_30px_rgba(34,197,94,0.8)]"
                : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-[0_0_30px_rgba(59,130,246,0.8)]"
            }`}
          >
            Trade Now
          </Button>
        ) : null}
      </div>

      {/* Current Signal Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`rounded-xl p-6 border text-center ${
          signal === "STRONG"
            ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/50 shadow-[0_0_40px_rgba(34,197,94,0.6)]"
            : signal === "TRADE"
              ? signalColor === "green"
                ? "bg-gradient-to-br from-green-500/15 to-emerald-500/15 border-green-500/40 shadow-[0_0_30px_rgba(34,197,94,0.5)]"
                : "bg-gradient-to-br from-blue-500/15 to-cyan-500/15 border-blue-500/40 shadow-[0_0_30px_rgba(59,130,246,0.5)]"
              : signalColor === "orange"
                ? "bg-gradient-to-br from-orange-500/15 to-yellow-500/15 border-orange-500/40"
                : "bg-gradient-to-br from-gray-500/10 to-gray-500/10 border-gray-500/30"
        } ${theme === "dark" ? "" : "bg-opacity-50"}`}
      >
        <Badge
          className={`text-2xl px-8 py-4 font-bold mb-4 ${
            signal === "STRONG"
              ? "bg-green-500 text-white shadow-[0_0_25px_rgba(34,197,94,0.8)] animate-pulse"
              : signal === "TRADE"
                ? signalColor === "green"
                  ? "bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.7)] animate-pulse"
                  : "bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.7)] animate-pulse"
                : signalColor === "orange"
                  ? "bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.6)] animate-pulse"
                  : "bg-gray-500 text-white"
          }`}
        >
          {signal}
        </Badge>
        <p className={`text-lg font-semibold mb-2 ${theme === "dark" ? "text-gray-100" : "text-gray-800"}`}>
          {signalMessage}
        </p>
        {(signal === "TRADE" || signal === "STRONG") && (
          <>
            <p className={`text-sm font-bold mt-3 ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`}>
              📍 Entry Point: {entryPoint}
            </p>
            <p className={`text-sm font-bold mt-1 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>
              🎯 Best Prediction: {prediction}
            </p>
            <p className={`text-xs mt-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Current Price: {currentPrice?.toFixed(5) || "---"}
            </p>
          </>
        )}
      </motion.div>

      {/* Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Under Bar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`rounded-xl p-6 border ${
            theme === "dark"
              ? "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30"
              : "bg-blue-50 border-blue-200"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-lg font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-700"}`}>
              Under (0, 1, 2, 3, 4)
            </h3>
            <span className={`text-2xl font-bold ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>
              {underPct.toFixed(1)}% {underTrend}
            </span>
          </div>
          <div className={`w-full h-8 rounded-full ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${underPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-8 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500"
            />
          </div>
        </motion.div>

        {/* Over Bar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`rounded-xl p-6 border ${
            theme === "dark"
              ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30"
              : "bg-green-50 border-green-200"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-lg font-bold ${theme === "dark" ? "text-green-400" : "text-green-700"}`}>
              Over (5, 6, 7, 8, 9)
            </h3>
            <span className={`text-2xl font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>
              {overPct.toFixed(1)}% {overTrend}
            </span>
          </div>
          <div className={`w-full h-8 rounded-full ${theme === "dark" ? "bg-gray-800" : "bg-gray-200"}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-8 rounded-full bg-gradient-to-r from-green-600 to-emerald-500"
            />
          </div>
        </motion.div>
      </div>

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className={`rounded-xl p-4 border text-center ${
            theme === "dark"
              ? "bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30"
              : "bg-purple-50 border-purple-200"
          }`}
        >
          <div className={`text-sm mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            Market Volatility
          </div>
          <div className={`text-2xl font-bold ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`}>
            {volatility.toFixed(2)}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className={`rounded-xl p-4 border text-center ${
            theme === "dark"
              ? "bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30"
              : "bg-orange-50 border-orange-200"
          }`}
        >
          <div className={`text-sm mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Change Rate</div>
          <div className={`text-2xl font-bold ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`}>
            {changeRate.toFixed(1)}%
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className={`rounded-xl p-4 border text-center ${
            theme === "dark"
              ? "bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30"
              : "bg-cyan-50 border-cyan-200"
          }`}
        >
          <div className={`text-sm mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Market Power</div>
          <div className={`text-2xl font-bold ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>
            {marketPower.toFixed(1)}%
          </div>
          <div className={`text-xs mt-1 ${theme === "dark" ? "text-gray-500" : "text-gray-600"}`}>{dominantSide}</div>
        </motion.div>
      </div>

      {/* Best Predictions */}
      {(signal === "TRADE" || signal === "STRONG") && prediction && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className={`rounded-xl p-6 border ${
            theme === "dark"
              ? "bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30"
              : "bg-yellow-50 border-yellow-200"
          }`}
        >
          <h3 className={`text-lg font-bold mb-3 ${theme === "dark" ? "text-yellow-400" : "text-yellow-700"}`}>
            🎯 Best Predictions
          </h3>
          <div className="flex flex-wrap gap-2">
            {prediction.split(", ").map((pred, idx) => (
              <Badge
                key={idx}
                className={`px-4 py-2 text-base font-semibold ${
                  theme === "dark"
                    ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40"
                    : "bg-yellow-200 text-yellow-800 border-yellow-400"
                }`}
              >
                {pred}
              </Badge>
            ))}
          </div>
        </motion.div>
      )}

      {/* Bottom Trade Button */}
      {signal === "TRADE" || signal === "STRONG" ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Button
            size="lg"
            className={`w-full px-8 py-6 text-xl font-bold text-white animate-pulse ${
              dominantSide === "OVER"
                ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-[0_0_35px_rgba(34,197,94,0.8)]"
                : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-[0_0_35px_rgba(59,130,246,0.8)]"
            }`}
          >
            TRADE NOW {dominantSide}
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Button
            size="lg"
            disabled
            className="w-full px-8 py-6 text-xl font-bold bg-gray-500 text-white cursor-not-allowed opacity-60"
          >
            WAIT
          </Button>
        </motion.div>
      )}
    </div>
  )
}
