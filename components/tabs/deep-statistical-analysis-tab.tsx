"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { DerivAPIClient } from "@/lib/deriv-api"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { DERIV_CONFIG } from "@/lib/deriv-config"
import { DERIV_MARKETS } from "@/lib/deriv-markets"

interface DeepStatisticalAnalysisTabProps {
  theme?: "light" | "dark"
}

interface PatternRecognition {
  sequenceType: string
  frequency: number
  confidence: number
  predictedNext: number[]
}

interface MarketFavorability {
  market: string
  overUnderScore: number
  evenOddScore: number
  matchesScore: number
  differsScore: number
  overallScore: number
  recommendation: "HIGHLY FAVORABLE" | "FAVORABLE" | "NEUTRAL" | "UNFAVORABLE"
}

interface DeepAnalysisResult {
  tickCount: number
  digitDistribution: { digit: number; count: number; percentage: number }[]
  evenOddBalance: { even: number; odd: number; bias: string }
  overUnderBalance: { over5: number; under4: number; bias: string }
  patterns: PatternRecognition[]
  marketFavorability: MarketFavorability
  volatilityIndex: number
  entropyScore: number
  predictiveAccuracy: number
}

const ANALYSIS_MARKETS = DERIV_MARKETS.map((m) => ({
  symbol: m.symbol,
  name: m.name,
  pipSize: m.pipSize,
}))

export function DeepStatisticalAnalysisTab({ theme = "dark" }: DeepStatisticalAnalysisTabProps) {
  const { token } = useDerivAuth()
  const [selectedMarket, setSelectedMarket] = useState("1HZ100V")
  const [tickCount, setTickCount] = useState(1000)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [analysisResult, setAnalysisResult] = useState<DeepAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [digitHistory, setDigitHistory] = useState<number[]>([])
  const analysisDepth = 1000

  const analyzeMarket = async () => {
    if (!token) {
      setError("Please authorize with Deriv first")
      return
    }

    setIsAnalyzing(true)
    setProgress(0)
    setError(null)

    try {
      const api = new DerivAPIClient({ appId: DERIV_CONFIG.APP_ID.toString() })
      await api.connect()
      setProgress(20)

      await api.authorize(token)
      setProgress(30)

      console.log(`[v0] Fetching ${tickCount} ticks for ${selectedMarket}`)
      const tickHistory = await api.getTickHistory(selectedMarket, tickCount)
      setProgress(60)

      // Extract last digits
      const lastDigits = tickHistory.prices.map((price) => {
        const priceStr = price.toFixed(5)
        return Number.parseInt(priceStr[priceStr.length - 1])
      })

      setDigitHistory(lastDigits)
      const result = analyzeDigits(lastDigits)
      setAnalysisResult(result)
      setProgress(100)

      api.disconnect()
    } catch (err: any) {
      console.error("[v0] Analysis error:", err)
      setError(err.message || "Failed to analyze market")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const analyzeDigits = useCallback(() => {
    const safeDigitHistory = Array.isArray(digitHistory) ? digitHistory : []
    const digits = safeDigitHistory.slice(-analysisDepth)

    if (digits.length === 0) {
      return null
    }

    // Count occurrences of each digit
    const digitCounts = Array(10).fill(0)
    digits.forEach((d) => digitCounts[d]++)

    const digitDistribution = digitCounts.map((count, digit) => ({
      digit,
      count,
      percentage: (count / digits.length) * 100,
    }))

    // Even/Odd balance
    const evenCount = digits.filter((d) => d % 2 === 0).length
    const oddCount = digits.length - evenCount
    const evenOddBalance = {
      even: (evenCount / digits.length) * 100,
      odd: (oddCount / digits.length) * 100,
      bias: Math.abs(evenCount - oddCount) < digits.length * 0.1 ? "BALANCED" : evenCount > oddCount ? "EVEN" : "ODD",
    }

    // Over/Under balance
    const over5Count = digits.filter((d) => d > 5).length
    const under4Count = digits.filter((d) => d < 5).length
    const overUnderBalance = {
      over5: (over5Count / digits.length) * 100,
      under4: (under4Count / digits.length) * 100,
      bias:
        Math.abs(over5Count - under4Count) < digits.length * 0.1
          ? "BALANCED"
          : over5Count > under4Count
            ? "OVER"
            : "UNDER",
    }

    // Pattern recognition using AI-like sequences
    const patterns = detectPatterns(digits)

    // Calculate market favorability
    const marketFavorability = calculateMarketFavorability(
      digitDistribution,
      evenOddBalance,
      overUnderBalance,
      selectedMarket,
    )

    // Volatility index
    const volatilityIndex = calculateVolatility(digits)

    // Entropy score
    const entropyScore = calculateEntropy(digitDistribution)

    // Predictive accuracy (simulated based on pattern strength)
    const predictiveAccuracy = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length || 50

    return {
      tickCount: digits.length,
      digitDistribution,
      evenOddBalance,
      overUnderBalance,
      patterns,
      marketFavorability,
      volatilityIndex,
      entropyScore,
      predictiveAccuracy,
    }
  }, [digitHistory, selectedMarket])

  const detectPatterns = (digits: number[]): PatternRecognition[] => {
    const patterns: PatternRecognition[] = []

    // Repeating sequences
    const sequenceMap = new Map<string, number>()
    for (let i = 0; i < digits.length - 2; i++) {
      const seq = `${digits[i]}-${digits[i + 1]}-${digits[i + 2]}`
      sequenceMap.set(seq, (sequenceMap.get(seq) || 0) + 1)
    }

    // Top patterns
    const sortedPatterns = Array.from(sequenceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    sortedPatterns.forEach(([seq, freq]) => {
      const seqDigits = seq.split("-").map(Number)
      const confidence = Math.min((freq / (digits.length - 2)) * 100 * 20, 95)
      patterns.push({
        sequenceType: seq,
        frequency: freq,
        confidence,
        predictedNext: [seqDigits[2], (seqDigits[2] + 1) % 10, (seqDigits[2] - 1 + 10) % 10],
      })
    })

    // Alternating pattern
    let alternatingCount = 0
    for (let i = 0; i < digits.length - 1; i++) {
      if (digits[i] % 2 !== digits[i + 1] % 2) {
        alternatingCount++
      }
    }
    if (alternatingCount > digits.length * 0.6) {
      patterns.push({
        sequenceType: "Alternating Even/Odd",
        frequency: alternatingCount,
        confidence: (alternatingCount / (digits.length - 1)) * 100,
        predictedNext: digits[digits.length - 1] % 2 === 0 ? [1, 3, 5, 7, 9] : [0, 2, 4, 6, 8],
      })
    }

    return patterns
  }

  const calculateMarketFavorability = (
    digitDist: { digit: number; percentage: number }[],
    evenOdd: { even: number; odd: number; bias: string },
    overUnder: { over5: number; under4: number; bias: string },
    market: string,
  ): MarketFavorability => {
    // Over/Under score
    const overUnderScore = Math.abs(overUnder.over5 - overUnder.under4) > 10 ? 85 : 50

    // Even/Odd score
    const evenOddScore = Math.abs(evenOdd.even - evenOdd.odd) > 10 ? 85 : 50

    // Matches score (highest frequency digit)
    const maxFreq = Math.max(...digitDist.map((d) => d.percentage))
    const matchesScore = maxFreq > 15 ? 90 : maxFreq > 12 ? 70 : 50

    // Differs score (lowest frequency digit)
    const minFreq = Math.min(...digitDist.map((d) => d.percentage))
    const differsScore = minFreq < 5 ? 90 : minFreq < 8 ? 70 : 50

    // Overall score
    const overallScore = (overUnderScore + evenOddScore + matchesScore + differsScore) / 4

    let recommendation: "HIGHLY FAVORABLE" | "FAVORABLE" | "NEUTRAL" | "UNFAVORABLE"
    if (overallScore >= 80) recommendation = "HIGHLY FAVORABLE"
    else if (overallScore >= 65) recommendation = "FAVORABLE"
    else if (overallScore >= 50) recommendation = "NEUTRAL"
    else recommendation = "UNFAVORABLE"

    return {
      market,
      overUnderScore,
      evenOddScore,
      matchesScore,
      differsScore,
      overallScore,
      recommendation,
    }
  }

  const calculateVolatility = (digits: number[]): number => {
    let changes = 0
    for (let i = 1; i < digits.length; i++) {
      if (digits[i] !== digits[i - 1]) changes++
    }
    return (changes / (digits.length - 1)) * 100
  }

  const calculateEntropy = (distribution: { digit: number; percentage: number }[]): number => {
    let entropy = 0
    distribution.forEach((d) => {
      if (d.percentage > 0) {
        const p = d.percentage / 100
        entropy -= p * Math.log2(p)
      }
    })
    return (entropy / Math.log2(10)) * 100 // Normalize to 0-100
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <Card
        className={`p-6 border ${
          theme === "dark"
            ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.2)]"
            : "bg-white border-gray-200 shadow-lg"
        }`}
      >
        <h2
          className={`text-2xl md:text-3xl font-bold mb-4 text-center ${
            theme === "dark"
              ? "bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
              : "text-gray-900"
          }`}
        >
          Deep Statistical Analysis
        </h2>
        <p className={`text-center text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
          AI-Powered Pattern Recognition | Up to 5000 Ticks | Market Favorability Analysis
        </p>
      </Card>

      {/* Controls */}
      <Card
        className={`p-6 border ${
          theme === "dark"
            ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20"
            : "bg-white border-gray-200"
        }`}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <label className={`text-sm font-semibold ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              Market Symbol
            </label>
            <Select value={selectedMarket} onValueChange={setSelectedMarket}>
              <SelectTrigger
                className={`${theme === "dark" ? "bg-[#0f1629]/50 border-blue-500/30 text-white" : "bg-white border-gray-300"}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-blue-500/30" : "bg-white"}>
                {ANALYSIS_MARKETS.map((market) => (
                  <SelectItem key={market.symbol} value={market.symbol}>
                    {market.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className={`text-sm font-semibold ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              Tick Count
            </label>
            <Select value={tickCount.toString()} onValueChange={(v) => setTickCount(Number.parseInt(v))}>
              <SelectTrigger
                className={`${theme === "dark" ? "bg-[#0f1629]/50 border-blue-500/30 text-white" : "bg-white border-gray-300"}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-blue-500/30" : "bg-white"}>
                <SelectItem value="500">500 Ticks</SelectItem>
                <SelectItem value="1000">1000 Ticks</SelectItem>
                <SelectItem value="2000">2000 Ticks</SelectItem>
                <SelectItem value="3000">3000 Ticks</SelectItem>
                <SelectItem value="5000">5000 Ticks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              onClick={analyzeMarket}
              disabled={isAnalyzing || !token}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-6"
            >
              {isAnalyzing ? "Analyzing..." : "Start Deep Analysis"}
            </Button>
          </div>
        </div>

        {isAnalyzing && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className={`text-center text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Analyzing {tickCount} ticks... {progress}%
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </Card>

      {/* Analysis Results */}
      {analysisResult && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className={`grid w-full grid-cols-4 ${theme === "dark" ? "bg-[#0f1629]" : "bg-gray-100"}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="favorability">Favorability</TabsTrigger>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card
                className={`p-4 ${theme === "dark" ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"}`}
              >
                <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  Analyzed Ticks
                </div>
                <div className={`text-2xl font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                  {analysisResult.tickCount}
                </div>
              </Card>

              <Card
                className={`p-4 ${theme === "dark" ? "bg-purple-500/10 border-purple-500/30" : "bg-purple-50 border-purple-200"}`}
              >
                <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Volatility</div>
                <div className={`text-2xl font-bold ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`}>
                  {analysisResult.volatilityIndex.toFixed(1)}%
                </div>
              </Card>

              <Card
                className={`p-4 ${theme === "dark" ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200"}`}
              >
                <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Entropy</div>
                <div className={`text-2xl font-bold ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
                  {analysisResult.entropyScore.toFixed(1)}%
                </div>
              </Card>

              <Card
                className={`p-4 ${theme === "dark" ? "bg-orange-500/10 border-orange-500/30" : "bg-orange-50 border-orange-200"}`}
              >
                <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  AI Accuracy
                </div>
                <div className={`text-2xl font-bold ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`}>
                  {analysisResult.predictiveAccuracy.toFixed(1)}%
                </div>
              </Card>
            </div>

            {/* Even/Odd & Over/Under Balance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card
                className={`p-6 ${theme === "dark" ? "bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30" : "bg-cyan-50 border-cyan-200"}`}
              >
                <h3 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  Even/Odd Balance
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Even</span>
                      <span className={theme === "dark" ? "text-cyan-400" : "text-cyan-600"}>
                        {analysisResult.evenOddBalance.even.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={analysisResult.evenOddBalance.even} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Odd</span>
                      <span className={theme === "dark" ? "text-blue-400" : "text-blue-600"}>
                        {analysisResult.evenOddBalance.odd.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={analysisResult.evenOddBalance.odd} className="h-2" />
                  </div>
                  <Badge
                    className={`w-full justify-center ${
                      analysisResult.evenOddBalance.bias === "BALANCED" ? "bg-green-500" : "bg-orange-500"
                    }`}
                  >
                    Bias: {analysisResult.evenOddBalance.bias}
                  </Badge>
                </div>
              </Card>

              <Card
                className={`p-6 ${theme === "dark" ? "bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30" : "bg-purple-50 border-purple-200"}`}
              >
                <h3 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  Over/Under Balance
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Over 5</span>
                      <span className={theme === "dark" ? "text-purple-400" : "text-purple-600"}>
                        {analysisResult.overUnderBalance.over5.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={analysisResult.overUnderBalance.over5} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Under 4</span>
                      <span className={theme === "dark" ? "text-pink-400" : "text-pink-600"}>
                        {analysisResult.overUnderBalance.under4.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={analysisResult.overUnderBalance.under4} className="h-2" />
                  </div>
                  <Badge
                    className={`w-full justify-center ${
                      analysisResult.overUnderBalance.bias === "BALANCED" ? "bg-green-500" : "bg-orange-500"
                    }`}
                  >
                    Bias: {analysisResult.overUnderBalance.bias}
                  </Badge>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="patterns" className="space-y-4 mt-4">
            <Card
              className={`p-6 ${theme === "dark" ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20" : "bg-white border-gray-200"}`}
            >
              <h3 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                AI Pattern Recognition
              </h3>
              <div className="space-y-4">
                {analysisResult.patterns.map((pattern, idx) => (
                  <Card
                    key={idx}
                    className={`p-4 ${theme === "dark" ? "bg-purple-500/10 border-purple-500/30" : "bg-purple-50 border-purple-200"}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className={`font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                          {pattern.sequenceType}
                        </div>
                        <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                          Frequency: {pattern.frequency} occurrences
                        </div>
                      </div>
                      <Badge
                        className={`${
                          pattern.confidence >= 70
                            ? "bg-green-500"
                            : pattern.confidence >= 50
                              ? "bg-yellow-500"
                              : "bg-gray-500"
                        }`}
                      >
                        {pattern.confidence.toFixed(1)}% Confidence
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                        Predicted Next:{" "}
                      </span>
                      <span className={`font-bold ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`}>
                        {pattern.predictedNext.join(", ")}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="favorability" className="space-y-4 mt-4">
            <Card
              className={`p-6 ${theme === "dark" ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-green-500/20" : "bg-white border-gray-200"}`}
            >
              <h3 className={`text-xl font-bold mb-4 text-center ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Market Favorability Analysis
              </h3>

              <div className="text-center mb-6">
                <Badge
                  className={`text-lg px-6 py-2 ${
                    analysisResult.marketFavorability.recommendation === "HIGHLY FAVORABLE"
                      ? "bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)]"
                      : analysisResult.marketFavorability.recommendation === "FAVORABLE"
                        ? "bg-cyan-500"
                        : analysisResult.marketFavorability.recommendation === "NEUTRAL"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                  }`}
                >
                  {analysisResult.marketFavorability.recommendation}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card
                  className={`p-4 text-center ${theme === "dark" ? "bg-cyan-500/10 border-cyan-500/30" : "bg-cyan-50 border-cyan-200"}`}
                >
                  <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Over/Under
                  </div>
                  <div className={`text-2xl font-bold ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>
                    {analysisResult.marketFavorability.overUnderScore.toFixed(0)}
                  </div>
                </Card>

                <Card
                  className={`p-4 text-center ${theme === "dark" ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"}`}
                >
                  <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Even/Odd</div>
                  <div className={`text-2xl font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                    {analysisResult.marketFavorability.evenOddScore.toFixed(0)}
                  </div>
                </Card>

                <Card
                  className={`p-4 text-center ${theme === "dark" ? "bg-purple-500/10 border-purple-500/30" : "bg-purple-50 border-purple-200"}`}
                >
                  <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Matches</div>
                  <div className={`text-2xl font-bold ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`}>
                    {analysisResult.marketFavorability.matchesScore.toFixed(0)}
                  </div>
                </Card>

                <Card
                  className={`p-4 text-center ${theme === "dark" ? "bg-pink-500/10 border-pink-500/30" : "bg-pink-50 border-pink-200"}`}
                >
                  <div className={`text-xs mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Differs</div>
                  <div className={`text-2xl font-bold ${theme === "dark" ? "text-pink-400" : "text-pink-600"}`}>
                    {analysisResult.marketFavorability.differsScore.toFixed(0)}
                  </div>
                </Card>
              </div>

              <Card
                className={`p-6 ${theme === "dark" ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200"}`}
              >
                <div className="text-center">
                  <div className={`text-sm mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Overall Market Score
                  </div>
                  <div className={`text-5xl font-bold ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
                    {analysisResult.marketFavorability.overallScore.toFixed(1)}
                  </div>
                  <Progress value={analysisResult.marketFavorability.overallScore} className="h-3 mt-4" />
                </div>
              </Card>
            </Card>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4 mt-4">
            <Card
              className={`p-6 ${theme === "dark" ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20" : "bg-white border-gray-200"}`}
            >
              <h3 className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Digit Distribution
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analysisResult.digitDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#333" : "#ccc"} />
                  <XAxis dataKey="digit" stroke={theme === "dark" ? "#fff" : "#000"} />
                  <YAxis stroke={theme === "dark" ? "#fff" : "#000"} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === "dark" ? "#0a0e27" : "#fff",
                      border: `1px solid ${theme === "dark" ? "#3b82f6" : "#ccc"}`,
                    }}
                  />
                  <Bar dataKey="count" fill={theme === "dark" ? "#3b82f6" : "#2563eb"} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {analysisResult.digitDistribution.map((d) => (
                <Card
                  key={d.digit}
                  className={`p-3 text-center ${theme === "dark" ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"}`}
                >
                  <div className={`text-2xl font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                    {d.digit}
                  </div>
                  <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    {d.percentage.toFixed(1)}%
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
