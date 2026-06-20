"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Square, TrendingUp } from "lucide-react"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { derivWebSocket } from "@/lib/deriv-websocket-manager"
import { DERIV_MARKETS, extractLastDigit } from "@/lib/deriv-markets"
import { StatsAnalysis } from "@/components/stats-analysis"
import { TradeLogDisplay, type TradeLogEntry } from "@/components/trade-log-display"
import { AutoBot, type BotStrategy, type AutoBotConfig } from "@/lib/autobots"
import { useDeriv } from "@/hooks/use-deriv"

interface AutomatedTradesTabProps {
  theme?: "light" | "dark"
}

const VALID_MARKETS = (Array.isArray(DERIV_MARKETS) ? DERIV_MARKETS : []).filter(
  (m) => m.category === "volatility_1s" || m.category === "volatility" || m.category === "jump",
)

export function AutomatedTradesTab({ theme = "dark" }: AutomatedTradesTabProps) {
  const { isLoggedIn, balance: authBalance, accountType } = useDerivAuth()
  const { ws } = useDeriv()

  const balance = authBalance?.amount || 1000
  const currency = authBalance?.currency || "USD"

  const [isRunning, setIsRunning] = useState(false)
  const [selectedMarket, setSelectedMarket] = useState("R_100")
  const [marketPrice, setMarketPrice] = useState<number>(0)
  const [lastDigit, setLastDigit] = useState<number>(0)
  const [last15Digits, setLast15Digits] = useState<number[]>([])
  const last15DigitsRef = useRef<number[]>([])
  const [totalProfit, setTotalProfit] = useState(0)
  const [tradesCount, setTradesCount] = useState(0)
  const [selectedStrategy, setSelectedStrategy] = useState<BotStrategy>("EVEN_ODD")
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting")
  const [tradeLogs, setTradeLogs] = useState<TradeLogEntry[]>([])
  const [bot, setBot] = useState<AutoBot | null>(null)
  const isInitializingRef = useRef(false)

  const targetProfit = (balance * 10) / 100
  const profitProgress = Math.min((totalProfit / targetProfit) * 100, 100)

  useEffect(() => {
    if (!isLoggedIn || isInitializingRef.current) return

    isInitializingRef.current = true
    let subscriptionId: string | null = null

    const initConnection = async () => {
      try {
        setConnectionStatus("connecting")

        if (!derivWebSocket.isConnected()) {
          await derivWebSocket.connect()

          let attempts = 0
          while (!derivWebSocket.isConnected() && attempts < 20) {
            await new Promise((resolve) => setTimeout(resolve, 500))
            attempts++
          }
        }

        if (!derivWebSocket.isConnected()) {
          setConnectionStatus("error")
          return
        }

        setConnectionStatus("connected")

        subscriptionId = await derivWebSocket.subscribeTicks(selectedMarket, (tickData) => {
          if (tickData.quote && Number.isFinite(tickData.quote)) {
            const price = tickData.quote
            setMarketPrice(price)

            const digit = extractLastDigit(price, selectedMarket)
            setLastDigit(digit)

            last15DigitsRef.current = [...last15DigitsRef.current, digit].slice(-15)
            setLast15Digits([...last15DigitsRef.current])
          }
        })

        console.log("[v0] AutoTrades subscribed to", selectedMarket)
      } catch (error) {
        console.error("[v0] AutoTrades connection error:", error)
        setConnectionStatus("error")
      } finally {
        isInitializingRef.current = false
      }
    }

    initConnection()

    return () => {
      if (subscriptionId) {
        derivWebSocket.unsubscribe(subscriptionId).catch(() => {})
      }
      isInitializingRef.current = false
    }
  }, [isLoggedIn, selectedMarket])

  const handleStart = async () => {
    if (!isLoggedIn) {
      alert("Please login first")
      return
    }

    if (connectionStatus !== "connected") {
      alert("Please wait for connection to establish")
      return
    }

    const config: AutoBotConfig = {
      symbol: selectedMarket,
      historyCount: 1000,
      duration: 5,
      durationUnit: "t",
      tpPercent: 10,
      slPercent: 50,
      useMartingale: false,
      martingaleMultiplier: 2,
      cooldownMs: 300,
      maxTradesPerMinute: 120,
      initialStake: (balance * 2) / 100,
      balance: balance,
    }

    try {
      const newBot = new AutoBot(ws as any, selectedStrategy, config)
      setBot(newBot)
      setIsRunning(true)

      await newBot.start((state) => {
        setTotalProfit(state.profitLoss)
        setTradesCount(state.tradesExecuted)

        if (state.profitLoss >= targetProfit || state.profitLoss <= -(balance * 50) / 100) {
          handleStop()
        }
      })
    } catch (error: any) {
      console.error("[v0] Bot start error:", error)
      alert(`Failed to start bot: ${error.message}`)
      setIsRunning(false)
    }
  }

  const handleStop = () => {
    if (bot) {
      bot.stop()
      setBot(null)
    }
    setIsRunning(false)
  }

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card
          className={
            theme === "dark"
              ? "bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/30"
              : "bg-blue-50 border-blue-200"
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Account Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {balance.toFixed(2)} {currency}
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            theme === "dark"
              ? "bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30"
              : "bg-green-50 border-green-200"
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Total Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold flex items-center gap-2 ${theme === "dark" ? "text-green-400" : "text-green-600"}`}
            >
              <TrendingUp className="w-6 h-6" />
              {totalProfit.toFixed(2)} {currency}
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            theme === "dark"
              ? "bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/30"
              : "bg-purple-50 border-purple-200"
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Trades Executed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {tradesCount}
            </div>
          </CardContent>
        </Card>

        <Card
          className={
            theme === "dark"
              ? "bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/30"
              : "bg-orange-50 border-orange-200"
          }
        >
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Target Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {profitProgress.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Information with Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          className={
            theme === "dark"
              ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-cyan-500/20"
              : "bg-white border-gray-200"
          }
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className={theme === "dark" ? "text-cyan-400" : "text-cyan-600"}>
                Market Data - {selectedMarket}
              </CardTitle>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${connectionStatus === "connected" ? "bg-green-400 animate-pulse" : connectionStatus === "connecting" ? "bg-yellow-400 animate-pulse" : "bg-red-400"}`}
                />
                <span className="text-xs text-gray-400 capitalize">{connectionStatus}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <p className="text-xs text-gray-400">Market Price</p>
                <p className="text-2xl font-bold text-purple-400">
                  {marketPrice > 0 ? marketPrice.toFixed(5) : "0.00000"}
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-xs text-gray-400">Current Digit</p>
                <p className="text-4xl font-bold text-green-400">{lastDigit}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <p className="text-xs text-gray-400">Account Type</p>
                <p className="text-lg font-bold text-orange-400">{accountType || "DEMO"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <StatsAnalysis last15Digits={last15Digits} theme={theme} showDetailedStats={true} />
      </div>

      {/* Trading Controls */}
      <Card
        className={
          theme === "dark"
            ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-cyan-500/20"
            : "bg-white border-gray-200"
        }
      >
        <CardHeader>
          <CardTitle className={theme === "dark" ? "text-cyan-400" : "text-cyan-600"}>
            Automated Trading Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Select Market
              </label>
              <Select value={selectedMarket} onValueChange={setSelectedMarket} disabled={isRunning}>
                <SelectTrigger
                  className={theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300"}
                >
                  <SelectValue placeholder="Select market" />
                </SelectTrigger>
                <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-cyan-500/30" : "bg-white"}>
                  {VALID_MARKETS.map((market) => (
                    <SelectItem key={market.symbol} value={market.symbol}>
                      {market.name} ({market.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Trading Strategy
              </label>
              <Select value={selectedStrategy} onValueChange={setSelectedStrategy} disabled={isRunning}>
                <SelectTrigger
                  className={theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300"}
                >
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-cyan-500/30" : "bg-white"}>
                  <SelectItem value="EVEN_ODD">Even/Odd Strategy</SelectItem>
                  <SelectItem value="OVER_UNDER">Over/Under Strategy</SelectItem>
                  <SelectItem value="DIFFERS">Differs Strategy</SelectItem>
                  <SelectItem value="MATCHES">Matches Strategy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Stake Range: {((balance * 2) / 100).toFixed(2)} - {((balance * 5) / 100).toFixed(2)} {currency}
              </p>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Target Profit: {targetProfit.toFixed(2)} {currency}
              </p>
            </div>
            {isRunning ? (
              <Button onClick={handleStop} variant="destructive" className="gap-2">
                <Square className="w-4 h-4" />
                Stop Bot
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                className="bg-green-500 hover:bg-green-600 gap-2"
                disabled={!isLoggedIn || connectionStatus !== "connected"}
              >
                <Play className="w-4 h-4" />
                Start Bot
              </Button>
            )}
          </div>

          <Progress value={profitProgress} className="h-2" />
        </CardContent>
      </Card>

      <TradeLogDisplay trades={tradeLogs} theme={theme} maxItems={50} />
    </div>
  )
}
