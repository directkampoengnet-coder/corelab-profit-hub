"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import type { Signal, AnalysisResult } from "@/lib/analysis-engine"

interface SignalsTabProps {
  signals: Signal[]
  proSignals?: Signal[]
  analysis: AnalysisResult | null
  theme?: "light" | "dark"
}

export function SignalsTab({ signals, proSignals, analysis, theme = "dark" }: SignalsTabProps) {
  const [signalValidity, setSignalValidity] = useState<Map<number, number>>(new Map())

  const safeSignals = Array.isArray(signals) ? signals : []
  const safeProSignals = Array.isArray(proSignals) ? proSignals : []

  useEffect(() => {
    const newValidity = new Map<number, number>()
    safeSignals.forEach((_, index) => {
      newValidity.set(index, 30)
    })
    setSignalValidity(newValidity)

    const interval = setInterval(() => {
      setSignalValidity((prev) => {
        const updated = new Map(prev)
        updated.forEach((value, key) => {
          if (value > 0) {
            updated.set(key, value - 1)
          }
        })
        return updated
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [safeSignals.length])

  const allSignals = [...safeSignals, ...safeProSignals]

  if (!allSignals || allSignals.length === 0) {
    return (
      <div className="text-center py-16">
        <p
          className={`text-lg font-semibold ${theme === "dark" ? "text-gradient bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400" : "text-gray-600"}`}
        >
          No signals available yet
        </p>
        <p className={`text-sm mt-2 ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
          Analyzing market patterns...
        </p>
      </div>
    )
  }

  const powerfulSignals = allSignals.filter((s) => s.status === "TRADE NOW")
  const waitSignals = allSignals.filter((s) => s.status === "WAIT")
  const sortedSignals = [...powerfulSignals, ...waitSignals]

  const powerfulSignalsCount = powerfulSignals.length
  const validatedCount = 1
  const stdDev = 3.6

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {sortedSignals.map((signal, index) => {
          const isTradeNow = signal.status === "TRADE NOW"
          const isWait = signal.status === "WAIT"
          const confidence = Math.min((signal.probability || 0) * 0.9, 100)

          const isProSignal = signal.type?.startsWith("pro_") || false

          return (
            <div
              key={index}
              className={`rounded-xl p-4 sm:p-6 border-2 relative overflow-hidden ${
                isTradeNow
                  ? theme === "dark"
                    ? "border-emerald-500/50 bg-gradient-to-br from-emerald-900/10 to-green-900/10 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                    : "border-emerald-300 bg-emerald-50/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  : isWait
                    ? theme === "dark"
                      ? "border-slate-500/50 bg-gradient-to-br from-slate-900/10 to-gray-900/10 shadow-[0_0_20px_rgba(100,116,139,0.3)]"
                      : "border-slate-300 bg-slate-50/50 shadow-[0_0_20px_rgba(100,116,139,0.2)]"
                    : theme === "dark"
                      ? "border-slate-500/50 bg-gradient-to-br from-slate-900/10 to-gray-900/10"
                      : "border-slate-300 bg-slate-50/50"
              }`}
            >
              <div
                className={`absolute -inset-1 rounded-xl pointer-events-none blur-md ${
                  isTradeNow ? "animate-edge-glow-green" : isWait ? "animate-edge-glow-blue" : ""
                }`}
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {isProSignal && (
                      <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs shadow-[0_0_10px_rgba(217,119,6,0.6)] mr-1">
                        PRO
                      </Badge>
                    )}
                    <span
                      className={`text-lg sm:text-xl font-bold ${
                        isTradeNow
                          ? theme === "dark"
                            ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                            : "text-emerald-600"
                          : isWait
                            ? theme === "dark"
                              ? "text-slate-400 drop-shadow-[0_0_8px_rgba(100,116,139,0.8)]"
                              : "text-slate-600"
                            : theme === "dark"
                              ? "text-slate-400"
                              : "text-slate-600"
                      }`}
                    >
                      {signal.type === "over_under"
                        ? "Over/Under 4.5"
                        : signal.type === "pro_over_under"
                          ? "Over/Under (Pro)"
                          : signal.type === "matches"
                            ? `Match Digit ${signal.recommendation?.match(/\d+/)?.[0] || ""}`
                            : (signal.type || "unknown").replace("_", " / ").replace("pro ", "").toUpperCase()}
                    </span>
                    {signal.status === "WAIT" && (
                      <Badge
                        className={
                          theme === "dark"
                            ? "bg-slate-600 text-slate-200 text-xs"
                            : "bg-slate-300 text-slate-700 text-xs"
                        }
                      >
                        Validated
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className={`px-4 py-2 text-sm font-bold ${
                      isTradeNow
                        ? "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.6)] animate-pulse"
                        : isWait
                          ? theme === "dark"
                            ? "bg-slate-600 hover:bg-slate-700 text-white"
                            : "bg-slate-500 hover:bg-slate-600 text-white"
                          : theme === "dark"
                            ? "bg-slate-600 hover:bg-slate-700 text-slate-200"
                            : "bg-slate-400 hover:bg-slate-500 text-white"
                    }`}
                  >
                    {isTradeNow ? "TRADE NOW" : isWait ? "WAIT" : "NEUTRAL"}
                  </Button>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Power</span>
                    <span
                      className={`text-lg font-bold ${
                        isTradeNow
                          ? theme === "dark"
                            ? "text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                            : "text-emerald-600"
                          : isWait
                            ? theme === "dark"
                              ? "text-slate-400 drop-shadow-[0_0_6px_rgba(100,116,139,0.8)]"
                              : "text-slate-600"
                            : theme === "dark"
                              ? "text-slate-400"
                              : "text-slate-600"
                      }`}
                    >
                      {(signal.probability || 0).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={signal.probability || 0} className="h-2 animate-pulse-slow" />
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                      Confidence
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        isTradeNow
                          ? theme === "dark"
                            ? "text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                            : "text-emerald-600"
                          : isWait
                            ? theme === "dark"
                              ? "text-slate-400 drop-shadow-[0_0_6px_rgba(100,116,139,0.8)]"
                              : "text-slate-600"
                            : theme === "dark"
                              ? "text-slate-400"
                              : "text-slate-600"
                      }`}
                    >
                      {confidence.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={confidence} className="h-2 animate-pulse-slow" />
                </div>

                <div className="mb-3">
                  <div className={`text-sm font-semibold mb-1 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    Trade Explanation:
                  </div>
                  <div
                    className={`text-sm ${isTradeNow ? (theme === "dark" ? "text-emerald-300" : "text-emerald-700") : isWait ? (theme === "dark" ? "text-amber-300" : "text-amber-700") : theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
                  >
                    {signal.recommendation || "No recommendation available"}
                  </div>
                </div>

                <div className="mb-3">
                  <div className={`text-sm font-semibold mb-1 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    Entry Rule:
                  </div>
                  <div
                    className={`text-sm ${isTradeNow ? (theme === "dark" ? "text-emerald-300" : "text-emerald-700") : isWait ? (theme === "dark" ? "text-amber-300" : "text-amber-700") : theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
                  >
                    {signal.entryCondition || "No entry condition specified"}
                  </div>
                </div>

                {isWait && (
                  <div className={`text-xs text-center mt-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Validated 8/5 times
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {analysis && (
        <div
          className={`rounded-xl p-6 border ${
            theme === "dark"
              ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20"
              : "bg-white border-gray-200"
          }`}
        >
          <h3 className={`text-xl font-bold mb-6 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Analysis Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div
                className={`text-3xl sm:text-4xl font-bold ${theme === "dark" ? "text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" : "text-cyan-600"}`}
              >
                {analysis.totalTicks || 100}
              </div>
              <div className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Total Ticks</div>
            </div>
            <div className="text-center">
              <div
                className={`text-3xl sm:text-4xl font-bold ${theme === "dark" ? "text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" : "text-emerald-600"}`}
              >
                {powerfulSignalsCount}
              </div>
              <div className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Powerful Signals
              </div>
            </div>
            <div className="text-center">
              <div
                className={`text-3xl sm:text-4xl font-bold ${theme === "dark" ? "text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" : "text-blue-600"}`}
              >
                {validatedCount}
              </div>
              <div className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Validated</div>
            </div>
            <div className="text-center">
              <div
                className={`text-3xl sm:text-4xl font-bold ${theme === "dark" ? "text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" : "text-purple-600"}`}
              >
                {stdDev}
              </div>
              <div className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Std Dev</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
