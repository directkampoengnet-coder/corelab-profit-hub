"use client"

import { Badge } from "@/components/ui/badge"
import type { Signal, AnalysisResult } from "@/lib/analysis-engine"

interface DiffersTabProps {
  analysis: AnalysisResult | null
  signals: Signal[]
  recentDigits: number[]
  theme?: "light" | "dark"
}

export function DiffersTab({ analysis, signals, recentDigits, theme = "dark" }: DiffersTabProps) {
  const safeSignals = Array.isArray(signals) ? signals : []
  const differsSignal = safeSignals.find((s) => s.type === "differs")

  if (!analysis) {
    return (
      <div className="text-center py-16">
        <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Loading analysis...</p>
      </div>
    )
  }

  const safeDigitFrequencies = Array.isArray(analysis.digitFrequencies) ? analysis.digitFrequencies : []
  const sorted = [...safeDigitFrequencies].sort((a, b) => a.count - b.count)
  const least3 = sorted.slice(0, 3)

  if (least3.length === 0) {
    return (
      <div className="text-center py-16">
        <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Waiting for digit data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div
        className={`rounded-xl p-8 border ${
          theme === "dark"
            ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
            : "bg-white border-gray-200 shadow-lg"
        }`}
      >
        <h2 className={`text-3xl font-bold mb-6 text-center ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          Differs Analysis
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {least3.map((freq, index) => (
            <div
              key={freq.digit}
              className={`text-center rounded-lg p-6 border ${
                index === 0
                  ? theme === "dark"
                    ? "bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                    : "bg-red-50 border-red-200"
                  : index === 1
                    ? theme === "dark"
                      ? "bg-orange-500/10 border-orange-500/30"
                      : "bg-orange-50 border-orange-200"
                    : theme === "dark"
                      ? "bg-yellow-500/10 border-yellow-500/30"
                      : "bg-yellow-50 border-yellow-200"
              }`}
            >
              <div className={`text-sm mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                {index === 0 ? "Least Appearing" : index === 1 ? "2nd Least" : "3rd Least"}
              </div>
              <div
                className={`text-6xl font-bold mb-2 ${
                  index === 0
                    ? theme === "dark"
                      ? "text-red-400"
                      : "text-red-600"
                    : index === 1
                      ? theme === "dark"
                        ? "text-orange-400"
                        : "text-orange-600"
                      : theme === "dark"
                        ? "text-yellow-400"
                        : "text-yellow-600"
                }`}
              >
                {freq.digit}
              </div>
              <div
                className={`text-xl font-bold ${
                  index === 0
                    ? theme === "dark"
                      ? "text-red-400"
                      : "text-red-600"
                    : index === 1
                      ? theme === "dark"
                        ? "text-orange-400"
                        : "text-orange-600"
                      : theme === "dark"
                        ? "text-yellow-400"
                        : "text-yellow-600"
                }`}
              >
                {freq.percentage.toFixed(1)}%
              </div>
              <div className={`text-sm mt-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Appeared {freq.count} times
              </div>
            </div>
          ))}
        </div>

        {differsSignal && (
          <div
            className={`rounded-xl p-6 border ${
              theme === "dark"
                ? "bg-blue-500/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <Badge
              className={`text-lg px-4 py-2 mb-4 ${
                differsSignal.status === "TRADE NOW"
                  ? theme === "dark"
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-green-100 text-green-700 border-green-300"
                  : theme === "dark"
                    ? "bg-gray-500/20 text-gray-400 border-gray-500/30"
                    : "bg-gray-100 text-gray-600 border-gray-300"
              }`}
            >
              {differsSignal.status}
            </Badge>
            <div className={`text-xl font-medium mb-2 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>
              {differsSignal.recommendation}
            </div>
            <div className={`text-base ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              {differsSignal.entryCondition}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
