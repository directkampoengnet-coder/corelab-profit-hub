"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Play, Square, AlertCircle, Info } from "lucide-react"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { AutoBot, type BotStrategy, type AutoBotState, type AutoBotConfig } from "@/lib/autobots"
import { DerivAPIClient } from "@/lib/deriv-api"
import { TradingProgressPanel } from "@/components/trading-progress-panel"

interface AutomatedTabProps {
  theme?: "light" | "dark"
  symbol: string
  currentDigit?: number | null
  currentPrice?: number | null
}

const BOT_STRATEGIES: {
  id: BotStrategy
  name: string
  description: string
  thresholds: { wait: number; tradeNow: number; strong?: number }
}[] = [
  {
    id: "EVEN_ODD",
    name: "EVEN/ODD Bot",
    description: "Analyzes Even/Odd digit bias. Shows WAIT at 50%+ increasing, TRADE NOW at 56%+.",
    thresholds: { wait: 50, tradeNow: 56 },
  },
  {
    id: "OVER3_UNDER6",
    name: "OVER3/UNDER6 Bot",
    description: "Over 3 (4-9) and Under 6 (0-5). WAIT at 53%+, TRADE NOW at 56%+, STRONG at 60%.",
    thresholds: { wait: 53, tradeNow: 56, strong: 60 },
  },
  {
    id: "OVER2_UNDER7",
    name: "OVER2/UNDER7 Bot",
    description: "Over 2 (3-9) and Under 7 (0-6). Predicts next 10-20 ticks.",
    thresholds: { wait: 53, tradeNow: 56, strong: 60 },
  },
  {
    id: "OVER1_UNDER8",
    name: "OVER1/UNDER8 Bot",
    description: "Over 1 (2-9) and Under 8 (0-7). Advanced power dynamics analysis.",
    thresholds: { wait: 53, tradeNow: 56, strong: 60 },
  },
  {
    id: "UNDER6",
    name: "UNDER6 Bot",
    description: "Specialized for digits 0-6. When 0-4 appears most (50%+), signals Under 6.",
    thresholds: { wait: 50, tradeNow: 55 },
  },
  {
    id: "DIFFERS",
    name: "DIFFERS Bot",
    description: "High precision strategy. Selects digits 2-7 with <10% power.",
    thresholds: { wait: 40, tradeNow: 50 },
  },
  {
    id: "EVEN_ODD_ADVANCED",
    name: "EVEN/ODD Advanced",
    description: "Advanced volatility detection with multi-level analysis.",
    thresholds: { wait: 50, tradeNow: 56 },
  },
  {
    id: "OVER_UNDER_ADVANCED",
    name: "OVER/UNDER Advanced",
    description: "Multi-level: 53%=WAIT, 56%+=TRADE NOW, 60%+=STRONG.",
    thresholds: { wait: 53, tradeNow: 56, strong: 60 },
  },
]

export function AutomatedTab({ theme = "dark", symbol, currentDigit, currentPrice }: AutomatedTabProps) {
  const {
    isLoggedIn,
    token,
    balance: authBalance,
    connectionStatus: authConnectionStatus,
    accountType,
  } = useDerivAuth()
  const [apiClient, setApiClient] = useState<DerivAPIClient | null>(null)
  const [apiConnectionStatus, setApiConnectionStatus] = useState<"disconnected" | "connecting" | "connected">(
    "disconnected",
  )

  // Bot Management
  const [selectedStrategy, setSelectedStrategy] = useState<BotStrategy>("EVEN_ODD")
  const [bot, setBot] = useState<AutoBot | null>(null)
  const [botState, setBotState] = useState<AutoBotState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const [last15Digits, setLast15Digits] = useState<number[]>([])
  const tickSubscriptionRef = useRef<string | null>(null)

  // Configuration - removed symbol from config, using prop instead
  const [config, setConfig] = useState<Omit<AutoBotConfig, "symbol">>({
    historyCount: 1000,
    duration: 5,
    durationUnit: "t",
    tpPercent: 10,
    slPercent: 50,
    useMartingale: false,
    martingaleMultiplier: 2,
    cooldownMs: 300,
    maxTradesPerMinute: 120,
    initialStake: 0.35,
    balance: 1000,
  })

  const isConnected = apiConnectionStatus === "connected"
  const isAuthorized = isConnected && isLoggedIn
  const isRunning = botState?.isRunning || false
  const canStart = !isRunning && isAuthorized && !isLoading

  useEffect(() => {
    if (currentDigit !== null && currentDigit !== undefined) {
      setLast15Digits((prev) => [currentDigit, ...prev].slice(0, 15))
    }
  }, [currentDigit])

  // Initialize API client
  useEffect(() => {
    if (!isLoggedIn || !token) {
      setApiClient(null)
      setApiConnectionStatus("disconnected")
      return
    }

    const initAPI = async () => {
      try {
        setApiConnectionStatus("connecting")
        const client = new DerivAPIClient({ token })
        await client.connect()
        await client.authorize(token)
        setApiClient(client)
        setApiConnectionStatus("connected")
        console.log("[v0] Automated Tab API client initialized")
      } catch (error) {
        console.error("[v0] Failed to init API client:", error)
        setLocalError("Failed to initialize API connection")
        setApiConnectionStatus("disconnected")
      }
    }

    initAPI()

    return () => {
      if (apiClient) {
        apiClient.disconnect()
      }
    }
  }, [isLoggedIn, token])

  // Update balance in config
  useEffect(() => {
    if (authBalance?.amount) {
      setConfig((prev) => ({ ...prev, balance: authBalance.amount }))
    }
  }, [authBalance?.amount])

  useEffect(() => {
    if (!isAuthorized || !apiClient || !symbol) return

    const subscribeTicks = async () => {
      try {
        if (tickSubscriptionRef.current) {
          try {
            await apiClient.forget(tickSubscriptionRef.current)
          } catch (e) {
            // Ignore forget errors
          }
        }

        const subId = await apiClient.subscribeTicks(symbol, () => {
          // Tick data comes from dashboard props now
        })

        tickSubscriptionRef.current = subId
        console.log("[v0] Automated tab subscribed to ticks:", symbol)
      } catch (error) {
        console.error("[v0] Failed to subscribe ticks:", error)
      }
    }

    subscribeTicks()

    return () => {
      if (tickSubscriptionRef.current && apiClient) {
        apiClient.forget(tickSubscriptionRef.current).catch(() => {})
      }
    }
  }, [isAuthorized, apiClient, symbol])

  const handleStart = async () => {
    setLocalError(null)
    setIsLoading(true)

    try {
      if (!isLoggedIn) {
        setLocalError("Please log in first")
        setIsLoading(false)
        return
      }

      if (!apiClient || !isConnected) {
        setLocalError("API client not ready. Please wait...")
        setIsLoading(false)
        return
      }

      if (config.initialStake <= 0) {
        setLocalError("Initial stake must be greater than 0")
        setIsLoading(false)
        return
      }

      if (config.initialStake > config.balance) {
        setLocalError("Initial stake exceeds account balance")
        setIsLoading(false)
        return
      }

      const fullConfig: AutoBotConfig = {
        ...config,
        symbol: symbol,
      }

      console.log(`[v0] Starting ${selectedStrategy} bot with config:`, fullConfig)

      const newBot = new AutoBot(apiClient, selectedStrategy, fullConfig)
      setBot(newBot)

      await newBot.start((state) => {
        setBotState(state)
        console.log("[v0] Bot state updated:", {
          totalRuns: state.totalRuns,
          wins: state.wins,
          losses: state.losses,
          profitLoss: state.profitLoss,
          isRunning: state.isRunning,
        })
      })

      setIsLoading(false)
    } catch (error: any) {
      console.error("[v0] Bot start error:", error)
      setLocalError(error.message || "Failed to start bot")
      setBot(null)
      setBotState(null)
      setIsLoading(false)
    }
  }

  const handleStop = () => {
    if (bot) {
      bot.stop()
      setBot(null)
      setBotState(null)
      setLocalError(null)
      console.log("[v0] Bot stopped")
    }
  }

  const getSignalStatus = () => {
    if (!botState) return { label: "IDLE", color: "bg-gray-500" }
    if (!isRunning) return { label: "STOPPED", color: "bg-gray-500" }

    const strategy = BOT_STRATEGIES.find((s) => s.id === selectedStrategy)
    const signal = (botState as any).currentSignal || { status: "NEUTRAL" }

    if (signal.status === "STRONG") return { label: "STRONG SIGNAL", color: "bg-green-600" }
    if (signal.status === "TRADE_NOW") return { label: "TRADE NOW", color: "bg-green-500" }
    if (signal.status === "WAIT") return { label: "WAIT", color: "bg-blue-500" }
    return { label: "ANALYZING", color: "bg-yellow-500" }
  }

  const signalStatus = getSignalStatus()
  const tpAmount = (config.balance * config.tpPercent) / 100
  const slAmount = (config.balance * config.slPercent) / 100

  return (
    <div className={`space-y-6 p-4 sm:p-6 ${theme === "dark" ? "bg-slate-900 text-white" : "bg-white text-black"}`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Automated Trading Bots</h2>
          <p className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            {accountType} Account - {isConnected ? "Connected" : "Disconnected"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">Balance: ${config.balance?.toFixed(2) || "0.00"}</p>
          {botState && (
            <p className={`text-sm font-bold ${botState.profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}>
              P&L: ${botState.profitLoss?.toFixed(2) || "0.00"} ({botState.profitLossPercent?.toFixed(1) || "0"}%)
            </p>
          )}
        </div>
      </div>

      <Card
        className={`border-l-4 border-l-cyan-500 ${theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}`}
      >
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

      {/* Status & Errors */}
      {localError && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950">
          <CardContent className="pt-6 flex items-center gap-2">
            <AlertCircle className="text-red-500" />
            <span className="text-red-700 dark:text-red-200">{localError}</span>
          </CardContent>
        </Card>
      )}

      {!isLoggedIn && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6 flex items-center gap-2">
            <Info className="text-yellow-600" />
            <span className="text-yellow-700 dark:text-yellow-200">Please log in to use automated trading</span>
          </CardContent>
        </Card>
      )}

      {/* Current Signal Display */}
      {isRunning && (
        <Card className={`border-l-4 border-l-blue-500 ${theme === "dark" ? "bg-slate-800/50" : "bg-white"}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Signal</span>
              <Badge className={`${signalStatus.color} text-white`}>{signalStatus.label}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className={`rounded p-3 ${theme === "dark" ? "bg-slate-800" : "bg-gray-100"}`}>
                <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Last Digit</p>
                <p className="text-2xl font-bold">
                  {currentDigit !== null && currentDigit !== undefined ? currentDigit : "—"}
                </p>
              </div>
              <div className={`rounded p-3 ${theme === "dark" ? "bg-slate-800" : "bg-gray-100"}`}>
                <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Market Price</p>
                <p className="text-2xl font-bold">${currentPrice?.toFixed(3) || "---"}</p>
              </div>
              <div className={`rounded p-3 ${theme === "dark" ? "bg-slate-800" : "bg-gray-100"}`}>
                <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Trades</p>
                <p className="text-2xl font-bold">{botState?.totalRuns || 0}</p>
              </div>
              <div className={`rounded p-3 ${theme === "dark" ? "bg-slate-800" : "bg-gray-100"}`}>
                <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Win Rate</p>
                <p className="text-2xl font-bold">
                  {botState?.totalRuns ? (((botState.wins || 0) / botState.totalRuns) * 100).toFixed(0) : "0"}%
                </p>
              </div>
            </div>

            {/* Last 15 Digits */}
            <div>
              <p className={`text-xs mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Last 15 Digits</p>
              <div className="flex flex-wrap gap-1">
                {last15Digits.map((digit, idx) => (
                  <div
                    key={idx}
                    className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                      digit % 2 === 0 ? "bg-blue-600 text-white" : "bg-yellow-600 text-white"
                    }`}
                  >
                    {digit}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trading Progress Panel */}
      {isRunning && botState && (
        <TradingProgressPanel
          isRunning={isRunning}
          status={
            botState.currentSignal?.status === "trading"
              ? "trading"
              : botState.currentSignal?.status === "analyzing"
                ? "waiting"
                : "completed"
          }
          totalTrades={botState?.totalRuns || 0}
          wins={botState?.wins || 0}
          losses={botState?.losses || 0}
          currentProfit={botState?.profitLoss || 0}
          targetProfit={(config.balance || 1000) * (config.tpPercent / 100)}
          stopLoss={(config.balance || 1000) * (config.slPercent / 100)}
          currentStake={config.initialStake}
          signalStatus={signalStatus}
        />
      )}

      {/* Strategy Selection */}
      <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}>
        <CardHeader>
          <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>Select Strategy</CardTitle>
          <CardDescription className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
            Choose a bot strategy to start trading
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BOT_STRATEGIES.map((strategy) => (
              <button
                key={strategy.id}
                onClick={() => !isRunning && setSelectedStrategy(strategy.id)}
                disabled={isRunning}
                className={`text-left p-3 rounded border-2 transition ${
                  selectedStrategy === strategy.id
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : `border-gray-300 dark:border-gray-600 hover:border-blue-300 ${theme === "dark" ? "bg-slate-800/30" : "bg-white"}`
                } ${isRunning ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <p className={`font-semibold text-sm ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  {strategy.name}
                </p>
                <p className={`text-xs mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  {strategy.description}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration - Removed Market Symbol selector */}
      <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}>
        <CardHeader>
          <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>Initial Stake ($)</Label>
              <Input
                type="number"
                value={config.initialStake}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, initialStake: Number.parseFloat(e.target.value) || 0 }))
                }
                disabled={isRunning}
                min="0.35"
                step="0.01"
                className={theme === "dark" ? "bg-slate-800 text-white border-gray-600" : ""}
              />
            </div>

            <div>
              <Label className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>Duration (Ticks)</Label>
              <Input
                type="number"
                value={config.duration}
                onChange={(e) => setConfig((prev) => ({ ...prev, duration: Number.parseInt(e.target.value) || 5 }))}
                disabled={isRunning}
                min="1"
                max="60"
                className={theme === "dark" ? "bg-slate-800 text-white border-gray-600" : ""}
              />
            </div>

            <div>
              <Label className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>Take Profit (%)</Label>
              <Input
                type="number"
                value={config.tpPercent}
                onChange={(e) => setConfig((prev) => ({ ...prev, tpPercent: Number.parseFloat(e.target.value) || 10 }))}
                disabled={isRunning}
                min="1"
                max="100"
                className={theme === "dark" ? "bg-slate-800 text-white border-gray-600" : ""}
              />
            </div>

            <div>
              <Label className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>Stop Loss (%)</Label>
              <Input
                type="number"
                value={config.slPercent}
                onChange={(e) => setConfig((prev) => ({ ...prev, slPercent: Number.parseFloat(e.target.value) || 50 }))}
                disabled={isRunning}
                min="1"
                max="100"
                className={theme === "dark" ? "bg-slate-800 text-white border-gray-600" : ""}
              />
            </div>

            <div>
              <Label className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>Martingale Multiplier</Label>
              <Input
                type="number"
                value={config.martingaleMultiplier}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, martingaleMultiplier: Number.parseFloat(e.target.value) || 2 }))
                }
                disabled={isRunning}
                min="1"
                max="5"
                step="0.1"
                className={theme === "dark" ? "bg-slate-800 text-white border-gray-600" : ""}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Switch
                checked={config.useMartingale}
                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, useMartingale: checked }))}
                disabled={isRunning}
              />
              <Label className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>Use Martingale</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {botState && (
        <Card className={theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}>
          <CardHeader>
            <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
                  Take Profit: ${tpAmount.toFixed(2)}
                </span>
                <span className="text-green-500">${Math.max(botState.profitLoss, 0).toFixed(2)}</span>
              </div>
              <Progress value={Math.min((Math.max(botState.profitLoss, 0) / tpAmount) * 100, 100)} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
                  Stop Loss: ${slAmount.toFixed(2)}
                </span>
                <span className="text-red-500">
                  ${Math.max(Math.abs(Math.min(botState.profitLoss, 0)), 0).toFixed(2)}
                </span>
              </div>
              <Progress
                value={Math.min((Math.max(Math.abs(Math.min(botState.profitLoss, 0)), 0) / slAmount) * 100, 100)}
                className="h-2"
              />
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className={`p-3 rounded ${theme === "dark" ? "bg-slate-800" : "bg-gray-100"}`}>
                <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Total Runs</p>
                <p className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  {botState.totalRuns}
                </p>
              </div>
              <div className={`p-3 rounded ${theme === "dark" ? "bg-slate-800" : "bg-gray-100"}`}>
                <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Wins</p>
                <p className="text-xl font-bold text-green-500">{botState.wins}</p>
              </div>
              <div className={`p-3 rounded ${theme === "dark" ? "bg-slate-800" : "bg-gray-100"}`}>
                <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Losses</p>
                <p className="text-xl font-bold text-red-500">{botState.losses}</p>
              </div>
              <div className={`p-3 rounded ${theme === "dark" ? "bg-slate-800" : "bg-gray-100"}`}>
                <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Win Rate</p>
                <p className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  {botState.totalRuns > 0 ? ((botState.wins / botState.totalRuns) * 100).toFixed(0) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        {!isRunning ? (
          <Button
            onClick={handleStart}
            disabled={!canStart || !isLoggedIn}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            <Play className="mr-2 h-5 w-5" />
            {isLoading ? "Starting..." : !isLoggedIn ? "Login Required" : "Start Bot"}
          </Button>
        ) : (
          <Button onClick={handleStop} variant="destructive" className="flex-1" size="lg">
            <Square className="mr-2 h-5 w-5" />
            Stop Bot
          </Button>
        )}
      </div>
    </div>
  )
}

export default AutomatedTab
