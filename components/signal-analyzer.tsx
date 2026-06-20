"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { generateCombinedSignal, type SignalType } from "@/lib/signal-strategies"
import { TrendingUp, AlertCircle } from "lucide-react"

interface SignalAnalyzerProps {
  currentNumber: number
  previousNumber?: number
  baselineNumber?: number
  showDetails?: boolean
}

const signalColors: Record<SignalType, { bg: string; text: string; border: string }> = {
  even: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
  odd: { bg: "bg-pink-500/20", text: "text-pink-400", border: "border-pink-500/30" },
  over: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
  under: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
  differs: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
}

export function SignalAnalyzer({
  currentNumber,
  previousNumber = currentNumber - 1,
  baselineNumber = currentNumber,
  showDetails = true,
}: SignalAnalyzerProps) {
  const signal = useMemo(
    () => generateCombinedSignal(currentNumber, previousNumber, baselineNumber),
    [currentNumber, previousNumber, baselineNumber],
  )

  const primaryColor = signalColors[signal.primarySignal]
  const confidencePercent = Math.round(signal.overallConfidence * 100)

  return (
    <div className="space-y-4">
      {/* Main Signal Card */}
      <Card className={`${primaryColor.bg} border-2 ${primaryColor.border}`}>
        <CardHeader>
          <CardTitle className={`text-lg flex items-center justify-between ${primaryColor.text}`}>
            <span>Signal Analysis</span>
            {signal.overallConfidence > 0.75 ? <TrendingUp className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {signal.primarySignal.toUpperCase()}
            </div>
            <p className="text-sm text-gray-400 mt-1">{signal.recommendation}</p>
          </div>

          {/* Confidence Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Confidence</span>
              <span className={`font-bold ${primaryColor.text}`}>{confidencePercent}%</span>
            </div>
            <div className="w-full bg-[#0a0e27]/50 rounded-full h-2 overflow-hidden border border-blue-500/20">
              <div
                className={`h-full ${
                  signal.overallConfidence > 0.75
                    ? "bg-gradient-to-r from-green-500 to-cyan-500"
                    : signal.overallConfidence > 0.5
                      ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                      : "bg-gradient-to-r from-red-500 to-pink-500"
                }`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Strategies */}
      {showDetails && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Even/Odd Strategy */}
          <Card className="bg-purple-500/10 border border-purple-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-purple-400">Even/Odd</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold text-purple-400">{signal.strategies.evenOdd.signal.toUpperCase()}</div>
              <div className="text-xs text-gray-400">{signal.strategies.evenOdd.reason}</div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Confidence</span>
                <span className="text-purple-400 font-bold">
                  {Math.round(signal.strategies.evenOdd.confidence * 100)}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Over/Under Strategy */}
          <Card className="bg-orange-500/10 border border-orange-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-orange-400">Over/Under</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold text-orange-400">
                {signal.strategies.overUnder.signal.toUpperCase()}
              </div>
              <div className="text-xs text-gray-400">{signal.strategies.overUnder.reason}</div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Confidence</span>
                <span className="text-orange-400 font-bold">
                  {Math.round(signal.strategies.overUnder.confidence * 100)}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Differs Strategy */}
          <Card className="bg-blue-500/10 border border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-400">Differs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-2xl font-bold text-blue-400">{signal.strategies.differs.signal.toUpperCase()}</div>
              <div className="text-xs text-gray-400">{signal.strategies.differs.reason}</div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Confidence</span>
                <span className="text-blue-400 font-bold">
                  {Math.round(signal.strategies.differs.confidence * 100)}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
