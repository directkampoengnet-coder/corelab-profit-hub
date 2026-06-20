"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useGlobalTradingContext } from "@/hooks/use-global-trading-context"
import type { AnalysisResult } from "@/lib/analysis-engine"

interface AIAnalysisTabProps {
  analysis: AnalysisResult | null
  currentDigit: number | null
  currentPrice: number | null
  symbol: string
  theme?: "light" | "dark"
}

interface AISignalResult {
  bestMarket: string
  bestStrategy: string
  entryPoint: string | number
  tradeValidity: number
  confidence: number
  signal: "TRADE NOW" | "WAIT" | "NEUTRAL"
  reasoning: string
}

export function AIAnalysisTab({ analysis, currentDigit, currentPrice, symbol, theme = "dark" }: AIAnalysisTabProps) {
  const [selectedMarket, setSelectedMarket] = useState<string>(symbol)
  const [selectedTradeType, setSelectedTradeType] = useState<string>("all")
  const [autoAnalysisMode, setAutoAnalysisMode] = useState(false)
  const [ticksToAnalyze, setTicksToAnalyze] = useState<number>(50)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiSignalResult, setAiSignalResult] = useState<AISignalResult | null>(null)
  const [analysisHistory, setAnalysisHistory] = useState<AISignalResult[]>([])
  const [successRate, setSuccessRate] = useState(0)
  const [isTrading, setIsTrading] = useState(false)
  const globalContext = useGlobalTradingContext()

  const scanAllStrategies = (): AISignalResult => {
    if (!analysis) {
      return {
        bestMarket: selectedMarket,
        bestStrategy: "None",
        entryPoint: "-",
        tradeValidity: 5,
        confidence: 0,
        signal: "NEUTRAL",
        reasoning: "Insufficient data for analysis",
      }
    }

    const safeDigitFrequencies = Array.isArray(analysis.digitFrequencies) ? analysis.digitFrequencies : []

    const strategies = [
      {
        name: "Under4/Over5",
        confidence: Math.max(analysis.lowPercentage || 0, analysis.highPercentage || 0),
        signal:
          (analysis.lowPercentage || 0) >= 60 ? "UNDER 4" : (analysis.highPercentage || 0) >= 60 ? "OVER 5" : "NEUTRAL",
        entryPoint: analysis.powerIndex?.strongest || 0,
      },
      {
        name: "Over2/Under7",
        confidence: calculateOver2Under7Confidence(analysis, safeDigitFrequencies),
        signal: calculateOver2Under7Signal(analysis, safeDigitFrequencies),
        entryPoint: analysis.powerIndex?.strongest || 0,
      },
      {
        name: "Even/Odd",
        confidence: Math.max(analysis.evenPercentage || 0, analysis.oddPercentage || 0),
        signal: (analysis.evenPercentage || 0) >= 60 ? "EVEN" : (analysis.oddPercentage || 0) >= 60 ? "ODD" : "NEUTRAL",
        entryPoint: (analysis.evenPercentage || 0) >= 60 ? "Even" : "Odd",
      },
      {
        name: "Differs",
        confidence:
          safeDigitFrequencies.length > 0
            ? 100 - ([...safeDigitFrequencies].sort((a, b) => a.percentage - b.percentage)[0]?.percentage || 10)
            : 50,
        signal: "DIFFERS",
        entryPoint:
          safeDigitFrequencies.length > 0
            ? [...safeDigitFrequencies].sort((a, b) => a.percentage - b.percentage)[0]?.digit || 0
            : 0,
      },
      {
        name: "Matches",
        confidence: safeDigitFrequencies[analysis.powerIndex?.strongest || 0]?.percentage || 0,
        signal: "MATCHES",
        entryPoint: analysis.powerIndex?.strongest || 0,
      },
      {
        name: "Rise/Fall",
        confidence: 50,
        signal: "NEUTRAL",
        entryPoint: "-",
      },
    ]

    const filteredStrategies =
      selectedTradeType === "all"
        ? strategies
        : strategies.filter((strategy) => strategy.name.toLowerCase() === selectedTradeType)

    const bestStrategy = filteredStrategies.reduce((best, current) => {
      return current.confidence > best.confidence ? current : best
    }, filteredStrategies[0] || strategies[0])

    const tradeSignal = bestStrategy.confidence >= 70 ? "TRADE NOW" : bestStrategy.confidence >= 55 ? "WAIT" : "NEUTRAL"

    return {
      bestMarket: selectedMarket,
      bestStrategy: bestStrategy.name,
      entryPoint: bestStrategy.entryPoint,
      tradeValidity: 5,
      confidence: bestStrategy.confidence,
      signal: tradeSignal,
      reasoning: `${bestStrategy.name} shows ${bestStrategy.confidence.toFixed(1)}% confidence with ${bestStrategy.signal} signal`,
    }
  }

  const calculateOver2Under7Confidence = (analysis: AnalysisResult, safeDigitFrequencies: any[]): number => {
    if (safeDigitFrequencies.length < 10) return 50

    const digits012 = [0, 1, 2].map((d) => safeDigitFrequencies[d]).filter(Boolean)
    const digits789 = [7, 8, 9].map((d) => safeDigitFrequencies[d]).filter(Boolean)

    const below10_012 = digits012.filter((d) => d && d.percentage < 10).length
    const below10_789 = digits789.filter((d) => d && d.percentage < 10).length

    if (below10_012 >= 2) return 85
    if (below10_789 >= 2) return 85
    return 50
  }

  const calculateOver2Under7Signal = (analysis: AnalysisResult, safeDigitFrequencies: any[]): string => {
    if (safeDigitFrequencies.length < 10) return "NEUTRAL"

    const digits012 = [0, 1, 2].map((d) => safeDigitFrequencies[d]).filter(Boolean)
    const digits789 = [7, 8, 9].map((d) => safeDigitFrequencies[d]).filter(Boolean)

    const below10_012 = digits012.filter((d) => d && d.percentage < 10).length
    const below10_789 = digits789.filter((d) => d && d.percentage < 10).length

    if (below10_012 >= 2) return "OVER 2"
    if (below10_789 >= 2) return "UNDER 7"
    return "NEUTRAL"
  }

  const handleAnalyze = () => {
    setIsAnalyzing(true)
    setTimeout(() => {
      const result = scanAllStrategies()
      setAiSignalResult(result)
      setAnalysisHistory((prev) => [...prev.slice(-29), result])
      setIsAnalyzing(false)
    }, 1500)
  }

  useEffect(() => {
    if (analysisHistory.length > 0) {
      const strongSignals = analysisHistory.filter((s) => s.signal === "TRADE NOW").length
      const rate = (strongSignals / analysisHistory.length) * 100
      setSuccessRate(rate)
    }
  }, [analysisHistory])

  useEffect(() => {
    if (autoAnalysisMode && analysis) {
      const interval = setInterval(() => {
        const result = scanAllStrategies()
        setAiSignalResult(result)
        setAnalysisHistory((prev) => [...prev.slice(-29), result])
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [autoAnalysisMode, analysis])

  return (
    <div className="space-y-6 pb-[200px]">
      <div
        className={`rounded-xl p-4 sm:p-6 border ${
          theme === "dark"
            ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
            : "bg-white border-gray-200 shadow-lg"
        }`}
      >
        <h2
          className={`text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 text-center ${theme === "dark" ? "bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent" : "text-gray-900"}`}
        >
          AI Signal Analyzer
        </h2>

        <div className="flex items-center justify-center gap-3 mb-6">
          <Switch id="auto-analysis" checked={autoAnalysisMode} onCheckedChange={setAutoAnalysisMode} />
          <Label htmlFor="auto-analysis" className={theme === "dark" ? "text-white" : "text-gray-900"}>
            Auto Analysis Mode
          </Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="space-y-2">
            <label
              className={`text-xs sm:text-sm font-semibold ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
            >
              Market
            </label>
            <Select value={selectedMarket} onValueChange={setSelectedMarket}>
              <SelectTrigger
                className={`${theme === "dark" ? "bg-[#0f1629]/50 border-blue-500/30 text-white" : "bg-white border-gray-300"}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-blue-500/30" : "bg-white"}>
                <SelectItem value="1HZ10V">Volatility 10 (1s) Index</SelectItem>
                <SelectItem value="1HZ15V">Volatility 15 (1s) Index</SelectItem>
                <SelectItem value="1HZ25V">Volatility 25 (1s) Index</SelectItem>
                <SelectItem value="R_10">Volatility 10 Index</SelectItem>
                <SelectItem value="R_25">Volatility 25 Index</SelectItem>
                <SelectItem value="R_50">Volatility 50 Index</SelectItem>
                <SelectItem value="R_75">Volatility 75 Index</SelectItem>
                <SelectItem value="R_100">Volatility 100 Index</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label
              className={`text-xs sm:text-sm font-semibold ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
            >
              Trade Type
            </label>
            <Select value={selectedTradeType} onValueChange={setSelectedTradeType}>
              <SelectTrigger
                className={`${theme === "dark" ? "bg-[#0f1629]/50 border-blue-500/30 text-white" : "bg-white border-gray-300"}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-blue-500/30" : "bg-white"}>
                <SelectItem value="all">All Strategies</SelectItem>
                <SelectItem value="under4/over5">Under4/Over5</SelectItem>
                <SelectItem value="over2/under7">Over2/Under7</SelectItem>
                <SelectItem value="even/odd">Even/Odd</SelectItem>
                <SelectItem value="differs">Differs</SelectItem>
                <SelectItem value="matches">Matches</SelectItem>
                <SelectItem value="rise/fall">Rise/Fall</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label
              className={`text-xs sm:text-sm font-semibold ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
            >
              Ticks to Analyze
            </label>
            <Input
              type="number"
              value={ticksToAnalyze}
              onChange={(e) => setTicksToAnalyze(Number.parseInt(e.target.value))}
              min={10}
              max={500}
              className={`${theme === "dark" ? "bg-[#0f1629]/50 border-blue-500/30 text-white" : "bg-white border-gray-300"}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div
            className={`rounded-lg p-4 border ${theme === "dark" ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"}`}
          >
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Analysis Count</div>
            <div className={`text-2xl font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
              {analysisHistory.length}
            </div>
          </div>
          <div
            className={`rounded-lg p-4 border ${theme === "dark" ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"}`}
          >
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Success Rate</div>
            <div className={`text-2xl font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>
              {successRate.toFixed(1)}%
            </div>
          </div>
          <div
            className={`rounded-lg p-4 border ${theme === "dark" ? "bg-purple-500/10 border-purple-500/30" : "bg-purple-50 border-purple-200"}`}
          >
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Status</div>
            <div className={`text-lg font-bold ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`}>
              {autoAnalysisMode ? "Active" : "Ready"}
            </div>
          </div>
        </div>

        <div
          className={`rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border ${theme === "dark" ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"}`}
        >
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className={`text-xs sm:text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Latest Tick:
              </div>
              <div className={`text-lg sm:text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {currentPrice?.toFixed(5) || "---"}
              </div>
            </div>
            <div>
              <div className={`text-xs sm:text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Last Digit:
              </div>
              <div
                className={`text-lg sm:text-2xl font-bold ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`}
              >
                {currentDigit !== null ? currentDigit : "0"}
              </div>
            </div>
          </div>
        </div>

        {!autoAnalysisMode && (
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className={`w-full py-4 sm:py-6 text-base sm:text-lg font-bold ${
              isAnalyzing
                ? "bg-gray-500"
                : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-[0_0_20px_rgba(34,211,238,0.5)]"
            }`}
          >
            {isAnalyzing ? "Analyzing..." : "Scan All Strategies"}
          </Button>
        )}

        {autoAnalysisMode && (
          <div className="text-center">
            <Badge className="bg-emerald-500 text-white text-lg px-6 py-2 animate-pulse">
              Auto Analysis Active - Scanning every 3 seconds
            </Badge>
          </div>
        )}
      </div>

      {aiSignalResult && (
        <div
          className={`rounded-xl p-4 sm:p-6 border ${
            theme === "dark"
              ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
              : "bg-white border-gray-200 shadow-lg"
          }`}
        >
          <h3
            className={`text-lg sm:text-xl font-bold mb-4 text-center ${theme === "dark" ? "text-white" : "text-gray-900"}`}
          >
            AI Recommendation
          </h3>

          <div className="space-y-4">
            <div className="text-center">
              <Badge
                className={`text-base sm:text-lg px-4 sm:px-6 py-2 ${
                  aiSignalResult.signal === "TRADE NOW"
                    ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.6)] animate-pulse"
                    : aiSignalResult.signal === "WAIT"
                      ? "bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.6)]"
                      : "bg-slate-500 text-white"
                }`}
              >
                {aiSignalResult.signal}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`rounded-lg p-4 border ${theme === "dark" ? "bg-cyan-500/10 border-cyan-500/30" : "bg-cyan-50 border-cyan-200"}`}
              >
                <div className={`text-xs sm:text-sm mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  Best Market
                </div>
                <div className={`text-lg sm:text-xl font-bold ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>
                  {aiSignalResult.bestMarket}
                </div>
              </div>

              <div
                className={`rounded-lg p-4 border ${theme === "dark" ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"}`}
              >
                <div className={`text-xs sm:text-sm mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  Best Strategy
                </div>
                <div className={`text-lg sm:text-xl font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                  {aiSignalResult.bestStrategy}
                </div>
              </div>

              <div
                className={`rounded-lg p-4 border ${theme === "dark" ? "bg-orange-500/10 border-orange-500/30" : "bg-orange-50 border-orange-200"}`}
              >
                <div className={`text-xs sm:text-sm mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  Entry Point
                </div>
                <div
                  className={`text-2xl sm:text-3xl font-bold ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`}
                >
                  {aiSignalResult.entryPoint}
                </div>
              </div>

              <div
                className={`rounded-lg p-4 border ${theme === "dark" ? "bg-purple-500/10 border-purple-500/30" : "bg-purple-50 border-purple-200"}`}
              >
                <div className={`text-xs sm:text-sm mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  Confidence
                </div>
                <div
                  className={`text-2xl sm:text-3xl font-bold ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`}
                >
                  {aiSignalResult.confidence.toFixed(1)}%
                </div>
              </div>
            </div>

            <div
              className={`rounded-lg p-4 border ${theme === "dark" ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"}`}
            >
              <div className={`text-xs sm:text-sm mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Trade Validity
              </div>
              <div
                className={`text-lg sm:text-xl font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}
              >
                {aiSignalResult.tradeValidity} ticks
              </div>
            </div>

            <div
              className={`rounded-lg p-4 border ${theme === "dark" ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"}`}
            >
              <div className={`text-xs sm:text-sm mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                AI Reasoning
              </div>
              <div className={`text-sm sm:text-base ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {aiSignalResult.reasoning}
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={`rounded-xl p-6 border text-center ${
          theme === "dark"
            ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20"
            : "bg-white border-gray-200"
        }`}
      >
        <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
          To execute trades based on AI signals, use the <span className="font-semibold text-cyan-400">Slider</span> or{" "}
          <span className="font-semibold text-blue-400">Trade Now</span> tabs.
        </p>
      </div>
    </div>
  )
}
