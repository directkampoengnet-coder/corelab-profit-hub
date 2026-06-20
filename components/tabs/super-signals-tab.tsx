"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Activity, Zap, X, Eye, Power, BarChart3 } from "lucide-react"
import { DerivAPIClient } from "@/lib/deriv-api"
import { extractLastDigit, getPipSize, DERIV_SYNTHETIC_MARKETS } from "@/lib/deriv-markets"
import { DERIV_CONFIG } from "@/lib/deriv-config"

interface MarketData {
  symbol: string
  displayName: string
  currentPrice: number
  lastDigit: number
  last15Digits: number[]
  last100Digits: number[]
  pipSize: number
  zeroEndingTicks: number[]
  analysis: {
    under: { count: number; percentage: number; signal: "WAIT" | "TRADE NOW" }
    over: { count: number; percentage: number; signal: "WAIT" | "TRADE NOW" }
    even: { count: number; percentage: number; signal: "WAIT" | "TRADE NOW" }
    odd: { count: number; percentage: number; signal: "WAIT" | "TRADE NOW" }
    differs: { digit: number; count: number; percentage: number; signal: "WAIT" | "TRADE NOW" }
    zeroEnding: { count: number; percentage: number; signal: "WAIT" | "TRADE NOW" }
    bias: string
  }
}

interface TradeSignal {
  market: string
  tradeType: string
  entryPoint: string
  validity: string
  confidence: number
  conditions: string[]
  category: "even-odd" | "over-under" | "differs" | "zero-ending"
}

const VALID_DERIV_MARKETS = DERIV_SYNTHETIC_MARKETS.filter(
  (m) => m.category === "volatility_1s" || m.category === "volatility",
)

function getDecimalPlaces(pipSize: number): number {
  return Math.round(-Math.log10(pipSize))
}

export function SuperSignalsTab() {
  const [marketsData, setMarketsData] = useState<Map<string, MarketData>>(new Map())
  const [tradeSignals, setTradeSignals] = useState<TradeSignal[]>([])
  const [showSignalPopup, setShowSignalPopup] = useState(false)
  const [autoShowSignals, setAutoShowSignals] = useState(true)
  const [signalsDeactivated, setSignalsDeactivated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting")
  const apiClientRef = useRef<DerivAPIClient | null>(null)
  const subscriptionIdsRef = useRef<Map<string, string>>(new Map())

  const analyzeDigits = useCallback((digits: number[], zeroEndingTicks: number[]): MarketData["analysis"] => {
    if (!Array.isArray(digits) || digits.length < 20) {
      return {
        over: { count: 0, percentage: 0, signal: "WAIT" },
        under: { count: 0, percentage: 0, signal: "WAIT" },
        even: { count: 0, percentage: 0, signal: "WAIT" },
        odd: { count: 0, percentage: 0, signal: "WAIT" },
        differs: { digit: 0, count: 0, percentage: 0, signal: "WAIT" },
        zeroEnding: { count: 0, percentage: 0, signal: "WAIT" },
        bias: "Collecting data...",
      }
    }

    const safeDigits = Array.isArray(digits) ? digits : []
    const recentDigits = safeDigits.slice(-100)
    const underCount = recentDigits.filter((d) => d < 5).length
    const overCount = recentDigits.filter((d) => d >= 5).length
    const evenCount = recentDigits.filter((d) => d % 2 === 0).length
    const oddCount = recentDigits.filter((d) => d % 2 === 1).length

    // Zero-ending ticks analysis
    const zeroCount = zeroEndingTicks.length
    const zeroPercentage = (zeroCount / recentDigits.length) * 100

    // Find least frequent digit for differs
    const digitCounts = Array(10).fill(0)
    recentDigits.forEach((d) => digitCounts[d]++)
    const minCount = Math.min(...digitCounts)
    const leastFrequentDigit = digitCounts.indexOf(minCount)

    // Calculate bias
    let bias = "Neutral"
    if (evenCount > oddCount + 10) bias = "Even Dominant"
    else if (oddCount > evenCount + 10) bias = "Odd Dominant"
    else if (underCount > overCount + 10) bias = "Under Dominant"
    else if (overCount > underCount + 10) bias = "Over Dominant"
    else if (zeroCount >= 10) bias = "Zero-Ending Pattern Detected"

    return {
      under: {
        count: underCount,
        percentage: underCount,
        signal: underCount >= 58 ? "TRADE NOW" : "WAIT",
      },
      over: {
        count: overCount,
        percentage: overCount,
        signal: overCount >= 58 ? "TRADE NOW" : "WAIT",
      },
      even: {
        count: evenCount,
        percentage: evenCount,
        signal: evenCount >= 58 ? "TRADE NOW" : "WAIT",
      },
      odd: {
        count: oddCount,
        percentage: oddCount,
        signal: oddCount >= 58 ? "TRADE NOW" : "WAIT",
      },
      differs: {
        digit: leastFrequentDigit,
        count: minCount,
        percentage: 100 - (minCount / recentDigits.length) * 100,
        signal: minCount <= 5 ? "TRADE NOW" : "WAIT",
      },
      zeroEnding: {
        count: zeroCount,
        percentage: zeroPercentage,
        signal: zeroCount >= 10 ? "TRADE NOW" : "WAIT",
      },
      bias,
    }
  }, [])

  const checkForTradeSignal = useCallback(
    (symbol: string, displayName: string, analysis: MarketData["analysis"], price: number, pipSize: number) => {
      if (signalsDeactivated) return

      const signals: TradeSignal[] = []
      const decimals = getDecimalPlaces(pipSize)

      if (analysis.zeroEnding.signal === "TRADE NOW") {
        signals.push({
          market: displayName,
          tradeType: "Zero Ending Pattern",
          entryPoint: price.toFixed(decimals),
          validity: "5 ticks",
          confidence: Math.min(analysis.zeroEnding.percentage * 5, 95),
          conditions: [
            `${analysis.zeroEnding.count} ticks ending in zero detected`,
            `Pattern strength: ${analysis.zeroEnding.percentage.toFixed(1)}%`,
            "Strong zero-ending pattern identified",
          ],
          category: "zero-ending",
        })
      }

      if (analysis.under.signal === "TRADE NOW") {
        signals.push({
          market: displayName,
          tradeType: "Under (0-4)",
          entryPoint: price.toFixed(decimals),
          validity: "5 ticks",
          confidence: Math.min(analysis.under.percentage, 95),
          conditions: [
            `Under digits appeared ${analysis.under.count} times in last 100 ticks`,
            `Current dominance: ${analysis.under.percentage}%`,
            "Strong probability for continuation",
          ],
          category: "over-under",
        })
      }

      if (analysis.over.signal === "TRADE NOW") {
        signals.push({
          market: displayName,
          tradeType: "Over (5-9)",
          entryPoint: price.toFixed(decimals),
          validity: "5 ticks",
          confidence: Math.min(analysis.over.percentage, 95),
          conditions: [
            `Over digits appeared ${analysis.over.count} times in last 100 ticks`,
            `Current dominance: ${analysis.over.percentage}%`,
            "Strong probability for continuation",
          ],
          category: "over-under",
        })
      }

      if (analysis.even.signal === "TRADE NOW") {
        signals.push({
          market: displayName,
          tradeType: "Even",
          entryPoint: price.toFixed(decimals),
          validity: "5 ticks",
          confidence: Math.min(analysis.even.percentage, 95),
          conditions: [
            `Even digits appeared ${analysis.even.count} times in last 100 ticks`,
            `Current dominance: ${analysis.even.percentage}%`,
            "Strong even pattern detected",
          ],
          category: "even-odd",
        })
      }

      if (analysis.odd.signal === "TRADE NOW") {
        signals.push({
          market: displayName,
          tradeType: "Odd",
          entryPoint: price.toFixed(decimals),
          validity: "5 ticks",
          confidence: Math.min(analysis.odd.percentage, 95),
          conditions: [
            `Odd digits appeared ${analysis.odd.count} times in last 100 ticks`,
            `Current dominance: ${analysis.odd.percentage}%`,
            "Strong odd pattern detected",
          ],
          category: "even-odd",
        })
      }

      if (analysis.differs.signal === "TRADE NOW") {
        signals.push({
          market: displayName,
          tradeType: `Differs ${analysis.differs.digit}`,
          entryPoint: price.toFixed(decimals),
          validity: "5 ticks",
          confidence: Math.min(analysis.differs.percentage, 95),
          conditions: [
            `Digit ${analysis.differs.digit} appeared only ${analysis.differs.count} times`,
            `Differs probability: ${analysis.differs.percentage.toFixed(1)}%`,
            "Highly underrepresented digit",
          ],
          category: "differs",
        })
      }

      if (signals.length > 0) {
        setTradeSignals((prev) => {
          const existingSignalTypes = new Set(prev.map((s) => `${s.market}-${s.tradeType}`))
          const newSignals = signals.filter((s) => !existingSignalTypes.has(`${s.market}-${s.tradeType}`))
          if (newSignals.length > 0 && autoShowSignals) {
            setShowSignalPopup(true)
          }
          return [...prev, ...newSignals].slice(-50)
        })
      }
    },
    [signalsDeactivated, autoShowSignals],
  )

  useEffect(() => {
    let isMounted = true

    const initializeMarkets = async () => {
      try {
        setConnectionStatus("connecting")

        // Create API client
        const client = new DerivAPIClient({ appId: DERIV_CONFIG.APP_ID })
        await client.connect()
        apiClientRef.current = client

        if (!isMounted) return

        // Initialize market data
        const initialData = new Map<string, MarketData>()
        VALID_DERIV_MARKETS.forEach((market) => {
          initialData.set(market.symbol, {
            symbol: market.symbol,
            displayName: market.name,
            currentPrice: 0,
            lastDigit: -1,
            last15Digits: [],
            last100Digits: [],
            pipSize: market.pipSize,
            zeroEndingTicks: [],
            analysis: {
              under: { count: 0, percentage: 0, signal: "WAIT" },
              over: { count: 0, percentage: 0, signal: "WAIT" },
              even: { count: 0, percentage: 0, signal: "WAIT" },
              odd: { count: 0, percentage: 0, signal: "WAIT" },
              differs: { digit: 0, count: 0, percentage: 0, signal: "WAIT" },
              zeroEnding: { count: 0, percentage: 0, signal: "WAIT" },
              bias: "Collecting data...",
            },
          })
        })

        setMarketsData(initialData)

        for (const market of VALID_DERIV_MARKETS) {
          if (!isMounted) break

          try {
            // Get historical ticks
            const history = await client.getTickHistory(market.symbol, 100)

            if (history.prices && history.prices.length > 0) {
              const historicalDigits = history.prices.map((price) => {
                return extractLastDigit(price, market.symbol)
              })

              const zeroTicks = history.prices.filter((price) => {
                const digit = extractLastDigit(price, market.symbol)
                return digit === 0
              })

              setMarketsData((prev) => {
                const updated = new Map(prev)
                const marketData = updated.get(market.symbol)
                if (marketData) {
                  updated.set(market.symbol, {
                    ...marketData,
                    last100Digits: historicalDigits,
                    last15Digits: historicalDigits.slice(-15),
                    zeroEndingTicks: zeroTicks,
                    analysis: analyzeDigits(historicalDigits, zeroTicks),
                  })
                }
                return updated
              })
            }
          } catch (error) {
            console.error(`Failed to fetch history for ${market.symbol}:`, error)
          }

          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        for (const market of VALID_DERIV_MARKETS) {
          if (!isMounted) break

          try {
            const subscriptionId = await client.subscribeTicks(market.symbol, (tick) => {
              if (!isMounted) return

              const lastDigit = extractLastDigit(tick.quote, market.symbol)
              const pipSize = getPipSize(market.symbol)

              setMarketsData((prev) => {
                const updated = new Map(prev)
                const marketData = updated.get(market.symbol)

                if (!marketData) return prev

                const newLast100Digits = [...marketData.last100Digits, lastDigit].slice(-100)
                const newLast15Digits = [...marketData.last15Digits, lastDigit].slice(-15)

                const newZeroEndingTicks =
                  lastDigit === 0 ? [...marketData.zeroEndingTicks, tick.quote].slice(-20) : marketData.zeroEndingTicks

                const analysis = analyzeDigits(newLast100Digits, newZeroEndingTicks)

                if (newLast100Digits.length >= 50) {
                  checkForTradeSignal(market.symbol, marketData.displayName, analysis, tick.quote, pipSize)
                }

                updated.set(market.symbol, {
                  ...marketData,
                  currentPrice: tick.quote,
                  lastDigit,
                  last15Digits: newLast15Digits,
                  last100Digits: newLast100Digits,
                  zeroEndingTicks: newZeroEndingTicks,
                  pipSize,
                  analysis,
                })

                return updated
              })
            })

            subscriptionIdsRef.current.set(market.symbol, subscriptionId)
            await new Promise((resolve) => setTimeout(resolve, 150))
          } catch (error) {
            console.error(`Failed to subscribe to ${market.symbol}:`, error)
          }
        }

        if (isMounted) {
          setConnectionStatus("connected")
          setIsLoading(false)
        }
      } catch (error) {
        console.error("Failed to initialize markets:", error)
        if (isMounted) {
          setConnectionStatus("error")
          setIsLoading(false)
        }
      }
    }

    initializeMarkets()

    return () => {
      isMounted = false
      // Cleanup subscriptions
      subscriptionIdsRef.current.forEach((subId) => {
        if (apiClientRef.current) {
          apiClientRef.current.forget(subId).catch(() => {})
        }
      })
      subscriptionIdsRef.current.clear()
      if (apiClientRef.current) {
        apiClientRef.current.disconnect()
      }
    }
  }, [analyzeDigits, checkForTradeSignal])

  const handleCloseSignal = (index: number) => {
    setTradeSignals((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCloseAllSignals = () => {
    setTradeSignals([])
    setShowSignalPopup(false)
  }

  const handleDismissPopup = () => {
    setShowSignalPopup(false)
  }

  const handleDeactivateSignals = () => {
    setSignalsDeactivated(true)
    setShowSignalPopup(false)
    setTradeSignals([])
  }

  const handleReactivateSignals = () => {
    setSignalsDeactivated(false)
    setTradeSignals([])
  }

  const totalMarkets = Array.from(marketsData.values())
  const marketsWithSignals = totalMarkets.filter(
    (m) =>
      m.analysis.under.signal === "TRADE NOW" ||
      m.analysis.over.signal === "TRADE NOW" ||
      m.analysis.even.signal === "TRADE NOW" ||
      m.analysis.odd.signal === "TRADE NOW" ||
      m.analysis.differs.signal === "TRADE NOW" ||
      m.analysis.zeroEnding.signal === "TRADE NOW",
  )
  const marketsWithData = totalMarkets.filter((m) => m.last100Digits.length >= 50)

  return (
    <div className="space-y-6">
      {/* Signal Popup */}
      {showSignalPopup && tradeSignals.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto bg-slate-900 border-cyan-500/50">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                Trade Signals ({tradeSignals.length})
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDeactivateSignals}
                  className="text-red-400 border-red-500/50 bg-transparent"
                >
                  <Power className="h-4 w-4 mr-1" />
                  Deactivate
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismissPopup}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {tradeSignals.slice(-10).map((signal, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    signal.category === "zero-ending"
                      ? "bg-purple-500/10 border-purple-500/30"
                      : signal.category === "even-odd"
                        ? "bg-blue-500/10 border-blue-500/30"
                        : signal.category === "over-under"
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-yellow-500/10 border-yellow-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white">{signal.market}</span>
                    <Badge
                      className={
                        signal.category === "zero-ending"
                          ? "bg-purple-500"
                          : signal.category === "even-odd"
                            ? "bg-blue-500"
                            : signal.category === "over-under"
                              ? "bg-green-500"
                              : "bg-yellow-500"
                      }
                    >
                      {signal.tradeType}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-400">
                    <p>Entry: {signal.entryPoint}</p>
                    <p>Confidence: {signal.confidence.toFixed(0)}%</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCloseSignal(idx)}
                    className="mt-2 text-gray-400"
                  >
                    Dismiss
                  </Button>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-700">
              <Button onClick={handleCloseAllSignals} variant="outline" className="w-full bg-transparent">
                Clear All Signals
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="frost-card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6 flex-wrap gap-3 sm:gap-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Super Signals - Multi-Market Analysis
          </h2>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Badge
              className={`text-xs px-2 py-1 ${
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "connecting"
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500"
              }`}
            >
              {connectionStatus === "connected"
                ? "Connected"
                : connectionStatus === "connecting"
                  ? "Connecting..."
                  : "Error"}
            </Badge>
            {signalsDeactivated ? (
              <Button
                onClick={handleReactivateSignals}
                className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-2 text-xs sm:text-sm"
                size="sm"
              >
                <Power className="h-3 w-3 sm:h-4 sm:w-4" />
                Activate Signals
              </Button>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-show-signals"
                    checked={autoShowSignals}
                    onCheckedChange={setAutoShowSignals}
                    disabled={signalsDeactivated}
                    className="data-[state=checked]:bg-green-500"
                  />
                  <Label htmlFor="auto-show-signals" className="text-xs sm:text-sm text-gray-400 cursor-pointer">
                    Auto-show signals
                  </Label>
                </div>
                {tradeSignals.length > 0 && (
                  <Button
                    onClick={() => setShowSignalPopup(true)}
                    size="sm"
                    variant="outline"
                    className="bg-yellow-700/50 hover:bg-yellow-700 border-yellow-600 text-white"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Signals ({tradeSignals.length})
                  </Button>
                )}
              </>
            )}
            <Badge className="bg-emerald-500 text-white text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2 animate-pulse flex items-center gap-1 sm:gap-2">
              <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">
                {signalsDeactivated ? "Inactive" : `Live ${VALID_DERIV_MARKETS.length} Markets`}
              </span>
              <span className="sm:hidden">{signalsDeactivated ? "Off" : `${VALID_DERIV_MARKETS.length}`}</span>
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="frost-glass rounded-lg p-3 sm:p-4">
            <div className="text-xs text-gray-400">Total Markets</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-400">{totalMarkets.length}</div>
          </div>
          <div className="frost-glass rounded-lg p-3 sm:p-4">
            <div className="text-xs text-gray-400">With Signals</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400">{marketsWithSignals.length}</div>
          </div>
          <div className="frost-glass rounded-lg p-3 sm:p-4">
            <div className="text-xs text-gray-400">Analyzing (50+ ticks)</div>
            <div className="text-xl sm:text-2xl font-bold text-purple-400">{marketsWithData.length}</div>
          </div>
          <div className="frost-glass rounded-lg p-3 sm:p-4">
            <div className="text-xs text-gray-400">Zero-Ending Patterns</div>
            <div className="text-xl sm:text-2xl font-bold text-yellow-400">
              {totalMarkets.filter((m) => m.analysis.zeroEnding.signal === "TRADE NOW").length}
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Connecting to markets and fetching historical data...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {totalMarkets.map((market) => {
            const hasSignal =
              market.analysis.under.signal === "TRADE NOW" ||
              market.analysis.over.signal === "TRADE NOW" ||
              market.analysis.even.signal === "TRADE NOW" ||
              market.analysis.odd.signal === "TRADE NOW" ||
              market.analysis.differs.signal === "TRADE NOW" ||
              market.analysis.zeroEnding.signal === "TRADE NOW"

            const decimals = getDecimalPlaces(market.pipSize)

            return (
              <Card
                key={market.symbol}
                className={`p-3 sm:p-4 border-2 backdrop-blur-md ${
                  hasSignal
                    ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse"
                    : "border-blue-500/30 bg-blue-500/5"
                }`}
              >
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base md:text-lg font-bold text-white truncate">
                      {market.displayName}
                    </h3>
                    <p className="text-xs text-gray-500">{market.symbol}</p>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <span className="text-xs text-gray-400">Price:</span>
                        <span className="text-xs sm:text-sm font-bold text-cyan-400 truncate">
                          {market.currentPrice > 0 ? market.currentPrice.toFixed(decimals) : "---"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <span className="text-xs text-gray-400">Last Digit:</span>
                        <span
                          className={`text-base sm:text-lg font-bold ${
                            market.lastDigit >= 0 ? "text-orange-400" : "text-gray-500"
                          }`}
                        >
                          {market.lastDigit >= 0 ? market.lastDigit : "-"}
                        </span>
                      </div>
                    </div>

                    {/* Zero-ending indicator */}
                    {market.analysis.zeroEnding.count > 0 && (
                      <div className="mt-2 p-2 bg-purple-500/10 rounded border border-purple-500/30">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-purple-400">Zero-Ending Ticks:</span>
                          <Badge
                            className={
                              market.analysis.zeroEnding.signal === "TRADE NOW" ? "bg-purple-500" : "bg-gray-600"
                            }
                          >
                            {market.analysis.zeroEnding.count}
                          </Badge>
                        </div>
                      </div>
                    )}

                    {market.last15Digits.length > 0 && (
                      <div className="mt-3 p-2 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <BarChart3 className="h-3 w-3 text-purple-400" />
                          <span className="text-xs text-gray-400">Last 15 Digits:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {market.last15Digits.map((digit, idx) => (
                            <span
                              key={idx}
                              className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded text-xs font-bold ${
                                digit === 0
                                  ? "bg-purple-500 text-white"
                                  : digit % 2 === 0
                                    ? "bg-blue-600 text-white"
                                    : "bg-orange-600 text-white"
                              }`}
                            >
                              {digit}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Analysis Summary */}
                <div className="grid grid-cols-3 gap-1 mt-2">
                  <div
                    className={`p-1 rounded text-center ${market.analysis.even.signal === "TRADE NOW" ? "bg-blue-500/30" : "bg-gray-800/30"}`}
                  >
                    <div className="text-xs text-gray-400">Even</div>
                    <div className="text-sm font-bold text-blue-400">{market.analysis.even.count}</div>
                  </div>
                  <div
                    className={`p-1 rounded text-center ${market.analysis.odd.signal === "TRADE NOW" ? "bg-orange-500/30" : "bg-gray-800/30"}`}
                  >
                    <div className="text-xs text-gray-400">Odd</div>
                    <div className="text-sm font-bold text-orange-400">{market.analysis.odd.count}</div>
                  </div>
                  <div
                    className={`p-1 rounded text-center ${market.analysis.differs.signal === "TRADE NOW" ? "bg-yellow-500/30" : "bg-gray-800/30"}`}
                  >
                    <div className="text-xs text-gray-400">Differs</div>
                    <div className="text-sm font-bold text-yellow-400">{market.analysis.differs.digit}</div>
                  </div>
                </div>

                {/* Bias */}
                <div className="mt-2 text-center">
                  <Badge className="bg-slate-700 text-gray-300 text-xs">{market.analysis.bias}</Badge>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SuperSignalsTab
