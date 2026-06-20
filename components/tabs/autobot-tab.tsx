"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { DerivAPIClient } from "@/lib/deriv-api"
import { AutoBot, type BotStrategy, type AutoBotState } from "@/lib/autobots"
import { StatsAnalysis } from "@/components/stats-analysis"
import { TradeLogDisplay } from "@/components/trade-log-display"
import { TradingProgressPanel } from "@/components/trading-progress-panel"

const BOT_STRATEGIES: {
  id: BotStrategy
  name: string
  description: string
  icon: string
}[] = [
  {
    id: "EVEN_ODD",
    name: "Even/Odd Bot",
    description: "Analyzes last 10 vs last 50 ticks for even/odd pattern trends",
    icon: "🎯",
  },
  {
    id: "EVEN_ODD_ADVANCED",
    name: "Even/Odd Advanced",
    description: "Enhanced even/odd detection with trend momentum analysis",
    icon: "⚡",
  },
  {
    id: "OVER1_UNDER8",
    name: "Over1/Under8 Bot",
    description: "Predicts digits over 1 or under 8 based on historical frequency",
    icon: "📊",
  },
  {
    id: "OVER2_UNDER7",
    name: "Over2/Under7 Bot",
    description: "Predicts digits over 2 or under 7 with range analysis",
    icon: "📈",
  },
  {
    id: "DIFFERS",
    name: "Differs Bot",
    description: "Predicts when next digit will differ from target digit",
    icon: "🔀",
  },
  {
    id: "SUPER_DIFFERS",
    name: "Super Differs",
    description: "Advanced differs strategy with multi-digit cycle tracking",
    icon: "⭐",
  },
]

interface AutoBotTabProps {
  theme?: "light" | "dark"
  symbol: string
  currentDigit?: number | null
  currentPrice?: number | null
}

export function AutoBotTab({ theme = "dark", symbol, currentDigit, currentPrice }: AutoBotTabProps) {
  const { token, balance, accountType, isLoggedIn } = useDerivAuth()

  const [selectedBot, setSelectedBot] = useState<BotStrategy | null>(null)
  const [botState, setBotState] = useState<AutoBotState | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connected">("disconnected")
  const [last15Digits, setLast15Digits] = useState<number[]>([])
  const [lastTradeResult, setLastTradeResult] = useState<"WIN" | "LOSS" | null>(null)
  const [lastTradeTime, setLastTradeTime] = useState<Date>()

  const [config, setConfig] = useState({
    initialStake: 0.35,
    duration: 5,
    tpPercent: 10,
    slPercent: 10,
    useMartingale: true,
    martingaleMultiplier: 2.0,
    maxTradesPerMinute: 3,
  })

  const apiClientRef = useRef<DerivAPIClient | null>(null)
  const botInstanceRef = useRef<AutoBot | null>(null)
  const tickSubscriptionRef = useRef<string | null>(null)

  useEffect(() => {
    if (currentDigit !== null && currentDigit !== undefined) {
      setLast15Digits((prev) => [...prev, currentDigit].slice(-15))
    }
  }, [currentDigit])

  useEffect(() => {
    if (!token || !isLoggedIn) return

    const initAPI = async () => {
      try {
        const client = new DerivAPIClient({ token })
        await client.connect()
        await client.authorize(token)

        apiClientRef.current = client
        setConnectionStatus("connected")

        console.log("[v0] AutoBot API connected")
      } catch (error) {
        console.error("[v0] AutoBot API connection error:", error)
        setConnectionStatus("disconnected")
      }
    }

    initAPI()

    return () => {
      if (botInstanceRef.current) {
        botInstanceRef.current.stop()
      }
      if (apiClientRef.current) {
        apiClientRef.current.disconnect()
      }
    }
  }, [token, isLoggedIn])

  useEffect(() => {
    if (connectionStatus !== "connected" || !apiClientRef.current || !symbol) return

    const subscribeTicks = async () => {
      try {
        if (tickSubscriptionRef.current) {
          await apiClientRef.current?.forgetSubscription(tickSubscriptionRef.current)
        }

        // Subscribe for trading purposes only
        const subscriptionId = await apiClientRef.current!.subscribeTicks(symbol, () => {
          // Tick updates handled by dashboard
        })

        tickSubscriptionRef.current = subscriptionId
        console.log("[v0] AutoBot subscribed to ticks for:", symbol)
      } catch (error) {
        console.error("[v0] Tick subscription error:", error)
      }
    }

    subscribeTicks()

    return () => {
      if (tickSubscriptionRef.current && apiClientRef.current) {
        apiClientRef.current.forgetSubscription(tickSubscriptionRef.current).catch(() => {})
      }
    }
  }, [connectionStatus, symbol])

  const startBot = async (strategy: BotStrategy) => {
    if (!apiClientRef.current || connectionStatus !== "connected") {
      alert("Please wait for connection to establish")
      return
    }

    if (!isLoggedIn || !token) {
      alert("Please log in to start trading")
      return
    }

    try {
      if (botInstanceRef.current) {
        botInstanceRef.current.stop()
      }

      const botConfig = {
        symbol: symbol,
        initialStake: config.initialStake,
        maxTradesPerMinute: config.maxTradesPerMinute,
        duration: config.duration,
        durationUnit: "t" as const,
        tpPercent: config.tpPercent,
        slPercent: config.slPercent,
        useMartingale: config.useMartingale,
        martingaleMultiplier: config.martingaleMultiplier,
        balance: balance?.amount || 1000,
        historyCount: 100,
        cooldownMs: 1000,
      }

      console.log("[v0] Starting AutoBot with config:", botConfig)

      const bot = new AutoBot(apiClientRef.current, strategy, botConfig)
      botInstanceRef.current = bot

      await bot.start((state) => {
        setBotState(state)
        if (state.trades.length > 0) {
          const lastTrade = state.trades[state.trades.length - 1]
          setLastTradeResult(lastTrade.result === "WIN" ? "WIN" : "LOSS")
          setLastTradeTime(new Date(lastTrade.timestamp))
        }
        if (!state.isRunning) {
          setIsRunning(false)
        }
      })

      setIsRunning(true)
      setSelectedBot(strategy)
      console.log("[v0] Bot started:", strategy)
    } catch (error: any) {
      console.error("[v0] Bot start error:", error)
      alert(`Failed to start bot: ${error.message}`)
      setIsRunning(false)
    }
  }

  const stopBot = () => {
    if (botInstanceRef.current) {
      botInstanceRef.current.stop()
      setIsRunning(false)
      console.log("[v0] Bot stopped")
    }
  }

  const totalTrades = botState?.totalRuns || 0
  const wins = botState?.wins || 0
  const losses = botState?.losses || 0
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : "0.0"
  const totalPL = botState?.profitLoss || 0

  return (
    <div
      className={`min-h-screen p-4 ${theme === "dark" ? "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" : "bg-gray-50"}`}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              AutoBot Trading
            </h1>
            <p className={theme === "dark" ? "text-slate-300" : "text-gray-600"}>
              Select a strategy and start automated trading
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant={connectionStatus === "connected" ? "default" : "destructive"}>
              {connectionStatus.toUpperCase()}
            </Badge>
            <Badge variant={accountType === "Demo" ? "secondary" : "default"}>{accountType || "N/A"}</Badge>
            <span className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              ${balance?.amount.toFixed(2) || "0.00"}
            </span>
          </div>
        </div>

        <Card className={theme === "dark" ? "bg-slate-800/50 border-cyan-500/30" : "bg-white border-gray-200"}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm ${theme === "dark" ? "text-cyan-400" : "text-blue-600"}`}>
              Current Market (from Dashboard)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Symbol</p>
                <p className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{symbol}</p>
              </div>
              <div>
                <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Price</p>
                <p className={`text-lg font-bold ${theme === "dark" ? "text-cyan-400" : "text-blue-600"}`}>
                  {currentPrice?.toFixed(4) || "---"}
                </p>
              </div>
              <div>
                <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Last Digit</p>
                <p
                  className={`text-2xl font-bold ${
                    currentDigit !== null && currentDigit !== undefined
                      ? currentDigit % 2 === 0
                        ? "text-blue-400"
                        : "text-orange-400"
                      : theme === "dark"
                        ? "text-gray-500"
                        : "text-gray-400"
                  }`}
                >
                  {currentDigit !== null && currentDigit !== undefined ? currentDigit : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isRunning && botState && (
          <TradingProgressPanel
            isRunning={isRunning}
            status={isRunning ? "trading" : "waiting"}
            totalTrades={botState.totalRuns || 0}
            wins={botState.wins || 0}
            losses={botState.losses || 0}
            currentProfit={botState.profitLoss || 0}
            targetProfit={(balance?.amount || 1000) * (config.tpPercent / 100)}
            stopLoss={(balance?.amount || 1000) * (config.slPercent / 100)}
            currentStake={config.initialStake}
            lastTradeResult={lastTradeResult}
            lastTradeTime={lastTradeTime}
          />
        )}

        {/* Configuration Panel - Removed Market Symbol selector */}
        <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}>
          <CardHeader>
            <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>Bot Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={`text-sm mb-1 block ${theme === "dark" ? "text-slate-300" : "text-gray-700"}`}>
                  Initial Stake ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.35"
                  className={`w-full rounded px-3 py-2 border ${
                    theme === "dark"
                      ? "bg-slate-700 text-white border-slate-600"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                  value={config.initialStake}
                  onChange={(e) => setConfig({ ...config, initialStake: Number(e.target.value) })}
                  disabled={isRunning}
                />
              </div>

              <div>
                <label className={`text-sm mb-1 block ${theme === "dark" ? "text-slate-300" : "text-gray-700"}`}>
                  Duration (Ticks)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className={`w-full rounded px-3 py-2 border ${
                    theme === "dark"
                      ? "bg-slate-700 text-white border-slate-600"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                  value={config.duration}
                  onChange={(e) => setConfig({ ...config, duration: Number(e.target.value) })}
                  disabled={isRunning}
                />
              </div>

              <div>
                <label className={`text-sm mb-1 block ${theme === "dark" ? "text-slate-300" : "text-gray-700"}`}>
                  Take Profit (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className={`w-full rounded px-3 py-2 border ${
                    theme === "dark"
                      ? "bg-slate-700 text-white border-slate-600"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                  value={config.tpPercent}
                  onChange={(e) => setConfig({ ...config, tpPercent: Number(e.target.value) })}
                  disabled={isRunning}
                />
              </div>

              <div>
                <label className={`text-sm mb-1 block ${theme === "dark" ? "text-slate-300" : "text-gray-700"}`}>
                  Stop Loss (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className={`w-full rounded px-3 py-2 border ${
                    theme === "dark"
                      ? "bg-slate-700 text-white border-slate-600"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                  value={config.slPercent}
                  onChange={(e) => setConfig({ ...config, slPercent: Number(e.target.value) })}
                  disabled={isRunning}
                />
              </div>

              <div>
                <label className={`text-sm mb-1 block ${theme === "dark" ? "text-slate-300" : "text-gray-700"}`}>
                  Martingale Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="3"
                  className={`w-full rounded px-3 py-2 border ${
                    theme === "dark"
                      ? "bg-slate-700 text-white border-slate-600"
                      : "bg-white text-gray-900 border-gray-300"
                  }`}
                  value={config.martingaleMultiplier}
                  onChange={(e) => setConfig({ ...config, martingaleMultiplier: Number(e.target.value) })}
                  disabled={isRunning}
                />
              </div>

              <div className="flex items-end">
                <label
                  className={`flex items-center gap-2 text-sm ${theme === "dark" ? "text-slate-300" : "text-gray-700"}`}
                >
                  <input
                    type="checkbox"
                    checked={config.useMartingale}
                    onChange={(e) => setConfig({ ...config, useMartingale: e.target.checked })}
                    disabled={isRunning}
                    className="w-4 h-4"
                  />
                  Enable Martingale
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bot Strategies */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className={`text-xl font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              Available Strategies
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BOT_STRATEGIES.map((strategy) => (
                <Card
                  key={strategy.id}
                  className={`cursor-pointer transition-all hover:scale-[1.02] ${
                    theme === "dark"
                      ? "bg-slate-800/50 border-slate-700 hover:bg-slate-700/50"
                      : "bg-white border-gray-200 hover:bg-gray-50"
                  } ${selectedBot === strategy.id && isRunning ? "ring-2 ring-green-500" : ""}`}
                >
                  <CardHeader>
                    <CardTitle
                      className={`flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                    >
                      <span className="text-2xl">{strategy.icon}</span>
                      {strategy.name}
                      {selectedBot === strategy.id && isRunning && (
                        <Badge variant="default" className="ml-auto bg-green-500">
                          RUNNING
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-sm mb-4 ${theme === "dark" ? "text-slate-300" : "text-gray-600"}`}>
                      {strategy.description}
                    </p>
                    {selectedBot === strategy.id && isRunning ? (
                      <Button onClick={stopBot} variant="destructive" className="w-full">
                        Stop Bot
                      </Button>
                    ) : (
                      <Button
                        onClick={() => startBot(strategy.id)}
                        disabled={isRunning || connectionStatus !== "connected" || !isLoggedIn}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {!isLoggedIn ? "Login Required" : "Start Bot"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Performance Stats */}
            {botState && (
              <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}>
                <CardHeader>
                  <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>
                    Performance Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-slate-700/30" : "bg-gray-100"}`}>
                      <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-gray-500"}`}>
                        Total Trades
                      </div>
                      <div className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {totalTrades}
                      </div>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-slate-700/30" : "bg-gray-100"}`}>
                      <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-gray-500"}`}>Win Rate</div>
                      <div className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {winRate}%
                      </div>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-slate-700/30" : "bg-gray-100"}`}>
                      <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-gray-500"}`}>W/L</div>
                      <div className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {wins}/{losses}
                      </div>
                    </div>
                    <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-slate-700/30" : "bg-gray-100"}`}>
                      <div className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-gray-500"}`}>
                        Total P/L
                      </div>
                      <div className={`text-2xl font-bold ${totalPL >= 0 ? "text-green-400" : "text-red-400"}`}>
                        ${totalPL.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Last 15 Digits */}
            <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}>
              <CardHeader>
                <CardTitle className={`text-sm ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  Last 15 Digits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StatsAnalysis last15Digits={last15Digits} />
              </CardContent>
            </Card>

            {/* Trade Log */}
            {botState && botState.trades.length > 0 && (
              <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}>
                <CardHeader>
                  <CardTitle className={`text-sm ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    Trade History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TradeLogDisplay
                    trades={botState.trades.map((t) => ({
                      id: t.id,
                      timestamp: t.timestamp,
                      contract_type: t.contract,
                      entry_spot: t.prediction,
                      exit_spot: t.prediction,
                      stake: t.stake,
                      profit: t.profitLoss,
                      status: t.result === "WIN" ? "win" : "loss",
                    }))}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AutoBotTab
