"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import type { Signal, AnalysisResult } from "@/lib/analysis-engine"

interface MatchesTabProps {
  analysis: AnalysisResult | null
  signals: Signal[]
  recentDigits: number[]
  theme?: "light" | "dark"
}

export function MatchesTab({ analysis, signals, recentDigits, theme = "dark" }: MatchesTabProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [scanResult, setScanResult] = useState<{ digit: number; accuracy: "high" | "medium" } | null>(null)

  const safeSignals = Array.isArray(signals) ? signals : []
  const safeRecentDigits = Array.isArray(recentDigits) ? recentDigits : []
  const matchesSignal = safeSignals.find((s) => s.type === "matches")

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  if (!analysis) {
    return (
      <div className="text-center py-16">
        <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Loading analysis...</p>
      </div>
    )
  }

  const safeDigitFrequencies = Array.isArray(analysis.digitFrequencies) ? analysis.digitFrequencies : []
  const sorted = [...safeDigitFrequencies].sort((a, b) => b.count - a.count)
  const top3 = sorted.slice(0, 3)
  const mostAppearing = top3[0] || { digit: 0, count: 0, percentage: 0 }

  if (top3.length === 0) {
    return (
      <div className="text-center py-16">
        <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Waiting for digit data...</p>
      </div>
    )
  }

  const handleScan = () => {
    setIsScanning(true)
    setCountdown(12)
    setScanResult(null)

    setTimeout(() => {
      const last12 = safeRecentDigits.slice(-12)
      const counts = new Map<number, number>()
      last12.forEach((d) => counts.set(d, (counts.get(d) || 0) + 1))
      const scannedMost = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]

      if (scannedMost && scannedMost[0] === mostAppearing.digit) {
        setScanResult({ digit: scannedMost[0], accuracy: "high" })
      } else {
        setScanResult({ digit: scannedMost?.[0] || 0, accuracy: "medium" })
      }
      setIsScanning(false)
      setCountdown(0)
    }, 12000)
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
          Matches Analysis
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {top3.map((freq, index) => (
            <div
              key={freq.digit}
              className={`text-center rounded-lg p-6 border ${
                index === 0
                  ? theme === "dark"
                    ? "bg-green-500/10 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                    : "bg-green-50 border-green-200"
                  : index === 1
                    ? theme === "dark"
                      ? "bg-yellow-500/10 border-yellow-500/30"
                      : "bg-yellow-50 border-yellow-200"
                    : theme === "dark"
                      ? "bg-orange-500/10 border-orange-500/30"
                      : "bg-orange-50 border-orange-200"
              }`}
            >
              <div className={`text-sm mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                {index === 0 ? "Most Appearing" : index === 1 ? "2nd Most" : "3rd Most"}
              </div>
              <div
                className={`text-6xl font-bold mb-2 ${
                  index === 0
                    ? theme === "dark"
                      ? "text-green-400"
                      : "text-green-600"
                    : index === 1
                      ? theme === "dark"
                        ? "text-yellow-400"
                        : "text-yellow-600"
                      : theme === "dark"
                        ? "text-orange-400"
                        : "text-orange-600"
                }`}
              >
                {freq.digit}
              </div>
              <div
                className={`text-xl font-bold ${
                  index === 0
                    ? theme === "dark"
                      ? "text-green-400"
                      : "text-green-600"
                    : index === 1
                      ? theme === "dark"
                        ? "text-yellow-400"
                        : "text-yellow-600"
                      : theme === "dark"
                        ? "text-orange-400"
                        : "text-orange-600"
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

        <div
          className={`rounded-xl p-6 border ${
            theme === "dark"
              ? "bg-blue-500/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
              : "bg-blue-50 border-blue-200"
          }`}
        >
          <h3 className={`text-lg font-bold mb-4 text-center ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Scan Digit Feature
          </h3>
          <div className="text-center mb-4">
            <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Digit to Match: <span className="font-bold text-lg">{mostAppearing.digit}</span> (appeared{" "}
              {mostAppearing.count} times, {mostAppearing.percentage.toFixed(1)}%)
            </div>
          </div>

          <div className="text-center">
            <Button
              onClick={handleScan}
              disabled={isScanning}
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-6 text-lg"
            >
              {isScanning ? `Scanning... ${countdown}s` : "Scan Last 12 Ticks"}
            </Button>
          </div>

          {scanResult && (
            <div
              className={`mt-6 p-6 rounded-lg text-center ${
                scanResult.accuracy === "high"
                  ? theme === "dark"
                    ? "bg-green-500/20 border border-green-500/30"
                    : "bg-green-100 border border-green-300"
                  : theme === "dark"
                    ? "bg-yellow-500/20 border border-yellow-500/30"
                    : "bg-yellow-100 border border-yellow-300"
              }`}
            >
              <div
                className={`text-2xl font-bold mb-2 ${
                  scanResult.accuracy === "high"
                    ? theme === "dark"
                      ? "text-green-400"
                      : "text-green-600"
                    : theme === "dark"
                      ? "text-yellow-400"
                      : "text-yellow-600"
                }`}
              >
                {scanResult.accuracy === "high" ? "HIGH ACCURACY SIGNAL" : "MEDIUM SIGNAL"}
              </div>
              <div className={`text-lg ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Scanned digit: <span className="font-bold text-2xl">{scanResult.digit}</span>
                {scanResult.accuracy === "high" ? " - Matches most appearing digit!" : " - Does not match perfectly"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
