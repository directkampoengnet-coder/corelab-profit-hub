"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { derivWebSocket } from "@/lib/deriv-websocket-manager"
import { getPipSize, DERIV_SYNTHETIC_MARKETS } from "@/lib/deriv-markets"
import { TradeLogDisplay } from "@/components/trade-log-display"
import { Play, Square, Zap, Settings, TrendingUp, RotateCcw } from "lucide-react"

const VOLATILITY_SYMBOLS = DERIV_SYNTHETIC_MARKETS.filter(
  (m) => m.category === "volatility" || m.category === "volatility_1s",
).map((m) => m.symbol)

type BotMode = "manual" | "autorun" | "speed"

interface TradeTransaction {
  id: string | number
  timestamp: number
  type: string
  entry: string
  exit: string
  stake: string
  result: string
  pnl: number
  status: "win" | "loss"
}

interface TradingBotSliderProps {
  // Props from main dashboard - optional for backward compatibility
  dashboardSymbol?: string
  dashboardPrice?: number | null
  dashboardDigit?: number | null
}

export default function TradingBotSlider({ dashboardSymbol, dashboardPrice, dashboardDigit }: TradingBotSliderProps) {
  const { token, accountType, balance, isLoggedIn } = useDerivAuth()

  // State management
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected")
  const [currentPrice, setCurrentPrice] = useState<number | null>(dashboardPrice ?? null)
  const [lastDigit, setLastDigit] = useState<number | null>(dashboardDigit ?? null)
  const [proposal, setProposal] = useState<any>(null)
  const [botMode, setBotMode] = useState<BotMode>("manual")
  const [isRunning, setIsRunning] = useState(false)
  const [isAwaitingResult, setIsAwaitingResult] = useState(false)
  const [transactions, setTransactions] = useState<TradeTransaction[]>([])
  const [showConfig, setShowConfig] = useState(true)

  // Form state - Use dashboard symbol if provided
  const [formState, setFormState] = useState({
    symbol: dashboardSymbol || "R_100",
    contractType: "DIGITMATCH",
    prediction: 5,
    stake: 0.35,
    duration: 5,
    durationUnit: "t",
    martingaleMultiplier: 1.5,
    takeProfit: 10,
    stopLoss: 5,
    enableMartingale: true,
    maxMartingaleSteps: 5,
  })

  // Refs for state that shouldn't trigger re-renders
  const tickSubscriptionIdRef = useRef<string | null>(null)
  const proposalSubscriptionIdRef = useRef<string | null>(null)
  const currentStakeRef = useRef(formState.stake)
  const autorunTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isConnectedRef = useRef(false)
  const martingaleStepRef = useRef(0)

  useEffect(() => {
    if (dashboardSymbol && dashboardSymbol !== formState.symbol) {
      setFormState((prev) => ({ ...prev, symbol: dashboardSymbol }))
    }
  }, [dashboardSymbol])

  useEffect(() => {
    if (dashboardPrice !== undefined) setCurrentPrice(dashboardPrice)
    if (dashboardDigit !== undefined) setLastDigit(dashboardDigit)
  }, [dashboardPrice, dashboardDigit])

  useEffect(() => {
    if (!token || !isLoggedIn) return

    const initConnection = async () => {
      try {
        setConnectionStatus("connecting")

        // Connect to WebSocket
        await derivWebSocket.connect()

        // Authorize with token
        await derivWebSocket.authorize(token)

        setConnectionStatus("connected")
        isConnectedRef.current = true

        console.log("[v0] Slider connected and authorized")
      } catch (error: any) {
        console.error("[v0] Connection error:", error)
        setConnectionStatus("disconnected")
      }
    }

    initConnection()

    // Cleanup on unmount
    return () => {
      if (tickSubscriptionIdRef.current) {
        derivWebSocket.unsubscribe(tickSubscriptionIdRef.current)
      }
      if (proposalSubscriptionIdRef.current) {
        derivWebSocket.unsubscribe(proposalSubscriptionIdRef.current)
      }
      if (autorunTimerRef.current) {
        clearTimeout(autorunTimerRef.current)
      }
    }
  }, [token, isLoggedIn])

  useEffect(() => {
    if (connectionStatus !== "connected" || !formState.symbol) return

    const subscribeTicks = async () => {
      try {
        // Unsubscribe from previous
        if (tickSubscriptionIdRef.current) {
          await derivWebSocket.unsubscribe(tickSubscriptionIdRef.current)
        }

        // Subscribe to new symbol
        const subscriptionId = await derivWebSocket.subscribeTicks(formState.symbol, (tick) => {
          setCurrentPrice(tick.quote)
          setLastDigit(tick.lastDigit)
        })

        tickSubscriptionIdRef.current = subscriptionId
        console.log("[v0] Subscribed to ticks for", formState.symbol)
      } catch (error) {
        console.error("[v0] Tick subscription error:", error)
      }
    }

    subscribeTicks()

    return () => {
      if (tickSubscriptionIdRef.current) {
        derivWebSocket.unsubscribe(tickSubscriptionIdRef.current)
        tickSubscriptionIdRef.current = null
      }
    }
  }, [connectionStatus, formState.symbol])

  useEffect(() => {
    if (connectionStatus !== "connected") return

    const getProposal = async () => {
      try {
        const proposalParams: any = {
          symbol: formState.symbol,
          contract_type: formState.contractType,
          amount: currentStakeRef.current,
          duration: formState.duration,
          duration_unit: formState.durationUnit,
          basis: "stake",
          currency: "USD",
        }

        // Add barrier for digit contracts
        if (["DIGITMATCH", "DIGITDIFF", "DIGITOVER", "DIGITUNDER"].includes(formState.contractType)) {
          proposalParams.barrier = String(formState.prediction)
        }

        const proposalData = await derivWebSocket.getProposal(proposalParams)
        setProposal(proposalData)
      } catch (error: any) {
        console.error("[v0] Proposal error:", error.message)
        setProposal(null)
      }
    }

    // Debounce proposal requests
    const timer = setTimeout(getProposal, 300)
    return () => clearTimeout(timer)
  }, [
    connectionStatus,
    formState.symbol,
    formState.contractType,
    formState.prediction,
    formState.stake,
    formState.duration,
    formState.durationUnit,
  ])

  const executeTrade = useCallback(async () => {
    if (!proposal || isAwaitingResult || connectionStatus !== "connected") {
      console.log("[v0] Cannot execute trade:", { proposal: !!proposal, isAwaitingResult, connectionStatus })
      return
    }

    try {
      setIsAwaitingResult(true)
      console.log("[v0] Executing trade with stake:", currentStakeRef.current)

      // Buy contract
      const buyResult = await derivWebSocket.buyContract(proposal.id, proposal.ask_price)

      console.log("[v0] Contract purchased:", buyResult.contract_id)

      // Subscribe to contract updates
      derivWebSocket.subscribeToContract(buyResult.contract_id, (contract) => {
        // Contract settled
        if (contract.is_sold || contract.status === "sold") {
          const profit = contract.profit || 0
          const isWin = profit > 0

          // Add transaction
          const transaction: TradeTransaction = {
            id: contract.contract_id,
            timestamp: Date.now(),
            type: formState.contractType,
            entry: String(contract.entry_tick || contract.buy_price),
            exit: String(contract.exit_tick || contract.sell_price),
            stake: String(currentStakeRef.current),
            result: isWin ? "Win" : "Loss",
            pnl: profit,
            status: isWin ? "win" : "loss",
          }

          setTransactions((prev) => [transaction, ...prev].slice(0, 50))

          // Apply martingale
          if (formState.enableMartingale) {
            if (isWin) {
              currentStakeRef.current = formState.stake
              martingaleStepRef.current = 0
            } else {
              martingaleStepRef.current++
              if (martingaleStepRef.current < formState.maxMartingaleSteps) {
                currentStakeRef.current = Number((currentStakeRef.current * formState.martingaleMultiplier).toFixed(2))
              } else {
                // Reset after max steps
                currentStakeRef.current = formState.stake
                martingaleStepRef.current = 0
              }
            }
          }

          // Check stop conditions
          const totalPL = transactions.reduce((sum, t) => sum + t.pnl, 0) + profit
          if (totalPL >= formState.takeProfit || totalPL <= -formState.stopLoss) {
            setIsRunning(false)
            console.log("[v0] Stop condition reached. Total P/L:", totalPL)
          }

          setIsAwaitingResult(false)

          // Continue autorun/speed mode
          if (isRunning && botMode !== "manual") {
            const delay = botMode === "speed" ? 500 : 2500
            autorunTimerRef.current = setTimeout(() => {
              executeTrade()
            }, delay)
          }
        }
      })
    } catch (error: any) {
      console.error("[v0] Trade execution error:", error)
      setIsAwaitingResult(false)
    }
  }, [proposal, isAwaitingResult, connectionStatus, formState, botMode, isRunning, transactions])

  const startBot = useCallback(() => {
    if (connectionStatus !== "connected" || !proposal) {
      console.log("[v0] Cannot start bot:", { connectionStatus, proposal: !!proposal })
      return
    }

    setIsRunning(true)
    currentStakeRef.current = formState.stake
    martingaleStepRef.current = 0
    executeTrade()
  }, [connectionStatus, proposal, formState.stake, executeTrade])

  const stopBot = useCallback(() => {
    setIsRunning(false)
    if (autorunTimerRef.current) {
      clearTimeout(autorunTimerRef.current)
    }
  }, [])

  const handleModeChange = (mode: BotMode) => {
    stopBot()
    setBotMode(mode)
  }

  const resetStats = () => {
    setTransactions([])
    currentStakeRef.current = formState.stake
    martingaleStepRef.current = 0
  }

  // Calculate stats
  const totalTrades = transactions.length
  const wins = transactions.filter((t) => t.status === "win").length
  const losses = totalTrades - wins
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : "0.0"
  const totalPL = transactions.reduce((sum, t) => sum + t.pnl, 0)

  const statusDisplay = connectionStatus ? connectionStatus.toUpperCase() : "DISCONNECTED"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Trading Bot</h1>
              <div className="flex items-center gap-4">
                <Badge variant={connectionStatus === "connected" ? "default" : "destructive"}>{statusDisplay}</Badge>
                <Badge variant={accountType === "Demo" ? "secondary" : "default"}>{accountType || "N/A"}</Badge>
                <span className="text-white">Balance: ${balance?.amount?.toFixed(2) || "0.00"}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              {showConfig ? "Hide Config" : "Show Config"}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Configuration */}
          <Card className={`lg:col-span-2 bg-slate-800/50 border-slate-700 ${!showConfig ? "hidden lg:block" : ""}`}>
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                Trading Configuration
                <Button variant="ghost" size="sm" onClick={resetStats} className="text-slate-400 hover:text-white">
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Market Info */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-700/30 rounded-lg">
                <div>
                  <div className="text-sm text-slate-400">Symbol</div>
                  <div className="text-lg font-semibold text-white">{formState.symbol}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Current Price</div>
                  <div className="text-lg font-semibold text-white">
                    {currentPrice?.toFixed(getPipSize(formState.symbol) >= 0.01 ? 2 : 4) || "--"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Last Digit</div>
                  <div
                    className={`text-lg font-semibold ${lastDigit !== null && lastDigit % 2 === 0 ? "text-blue-400" : "text-yellow-400"}`}
                  >
                    {lastDigit ?? "--"}
                  </div>
                </div>
              </div>

              {/* Form Controls */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-300 mb-1 block">Market Symbol</label>
                  <select
                    className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600"
                    value={formState.symbol}
                    onChange={(e) => setFormState({ ...formState, symbol: e.target.value })}
                  >
                    {VOLATILITY_SYMBOLS.map((sym) => (
                      <option key={sym} value={sym}>
                        {sym}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-300 mb-1 block">Contract Type</label>
                  <select
                    className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600"
                    value={formState.contractType}
                    onChange={(e) => setFormState({ ...formState, contractType: e.target.value })}
                  >
                    <option value="DIGITMATCH">Matches</option>
                    <option value="DIGITDIFF">Differs</option>
                    <option value="DIGITOVER">Over</option>
                    <option value="DIGITUNDER">Under</option>
                    <option value="DIGITEVEN">Even</option>
                    <option value="DIGITODD">Odd</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-300 mb-1 block">Prediction Digit</label>
                  <select
                    className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600"
                    value={formState.prediction}
                    onChange={(e) => setFormState({ ...formState, prediction: Number(e.target.value) })}
                    disabled={["DIGITEVEN", "DIGITODD"].includes(formState.contractType)}
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-slate-300 mb-1 block">Stake (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.35"
                    className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600"
                    value={formState.stake}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setFormState({ ...formState, stake: val })
                      currentStakeRef.current = val
                    }}
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-300 mb-1 block">Duration (Ticks)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600"
                    value={formState.duration}
                    onChange={(e) => setFormState({ ...formState, duration: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-300 mb-1 block">Take Profit (USD)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600"
                    value={formState.takeProfit}
                    onChange={(e) => setFormState({ ...formState, takeProfit: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-300 mb-1 block">Stop Loss (USD)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600"
                    value={formState.stopLoss}
                    onChange={(e) => setFormState({ ...formState, stopLoss: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Martingale Settings */}
              <div className="p-4 bg-slate-700/30 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="martingale" className="text-slate-300">
                    Enable Martingale
                  </Label>
                  <Switch
                    id="martingale"
                    checked={formState.enableMartingale}
                    onCheckedChange={(checked) => setFormState({ ...formState, enableMartingale: checked })}
                  />
                </div>
                {formState.enableMartingale && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-300 mb-1 block">Multiplier</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="3"
                        className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600"
                        value={formState.martingaleMultiplier}
                        onChange={(e) => setFormState({ ...formState, martingaleMultiplier: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-300 mb-1 block">Max Steps</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        className="w-full bg-slate-700 text-white rounded px-3 py-2 border border-slate-600"
                        value={formState.maxMartingaleSteps}
                        onChange={(e) => setFormState({ ...formState, maxMartingaleSteps: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Proposal Display */}
              {proposal && (
                <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Ask Price:</span>
                      <span className="ml-2 text-white font-semibold">${proposal.ask_price?.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Payout:</span>
                      <span className="ml-2 text-white font-semibold">${proposal.payout?.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Potential Profit:</span>
                      <span className="ml-2 text-green-400 font-semibold">
                        ${(proposal.payout - proposal.ask_price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Trading Mode Buttons */}
              <div className="flex gap-2">
                <Button
                  variant={botMode === "manual" ? "default" : "outline"}
                  onClick={() => handleModeChange("manual")}
                  className="flex-1"
                >
                  Manual
                </Button>
                <Button
                  variant={botMode === "autorun" ? "default" : "outline"}
                  onClick={() => handleModeChange("autorun")}
                  className="flex-1"
                >
                  Autorun
                </Button>
                <Button
                  variant={botMode === "speed" ? "default" : "outline"}
                  onClick={() => handleModeChange("speed")}
                  className="flex-1"
                >
                  <Zap className="h-4 w-4 mr-1" /> Speed
                </Button>
              </div>

              {/* Control Buttons */}
              <div className="flex gap-2">
                {botMode === "manual" ? (
                  <Button
                    onClick={executeTrade}
                    disabled={!proposal || isAwaitingResult || connectionStatus !== "connected"}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Trade Now
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={startBot}
                      disabled={isRunning || !proposal || connectionStatus !== "connected"}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Bot
                    </Button>
                    <Button onClick={stopBot} disabled={!isRunning} className="flex-1 bg-red-600 hover:bg-red-700">
                      <Square className="h-4 w-4 mr-2" />
                      Stop Bot
                    </Button>
                  </>
                )}
              </div>

              {/* Status indicator */}
              {isRunning && (
                <div className="p-3 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-medium">Bot Running - {botMode} mode</span>
                  {isAwaitingResult && <span className="text-yellow-400 ml-2">(Waiting for result...)</span>}
                </div>
              )}

              {/* Stats Summary */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-slate-700/30 rounded-lg">
                <div>
                  <div className="text-xs text-slate-400">Total Trades</div>
                  <div className="text-lg font-semibold text-white">{totalTrades}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Win Rate</div>
                  <div className="text-lg font-semibold text-white">{winRate}%</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Wins/Losses</div>
                  <div className="text-lg font-semibold text-white">
                    <span className="text-green-400">{wins}</span>/<span className="text-red-400">{losses}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Total P/L</div>
                  <div className={`text-lg font-semibold ${totalPL >= 0 ? "text-green-400" : "text-red-400"}`}>
                    ${totalPL.toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Trade History */}
          <div className="space-y-4">
            {/* Current Stake Info */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Current Trade Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-700/30 rounded">
                    <div className="text-xs text-slate-400">Current Stake</div>
                    <div className="text-xl font-bold text-cyan-400">${currentStakeRef.current.toFixed(2)}</div>
                  </div>
                  <div className="p-3 bg-slate-700/30 rounded">
                    <div className="text-xs text-slate-400">Martingale Step</div>
                    <div className="text-xl font-bold text-purple-400">
                      {martingaleStepRef.current}/{formState.maxMartingaleSteps}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trade History */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <TradeLogDisplay
                  trades={transactions.map((t) => ({
                    id: String(t.id),
                    timestamp: t.timestamp,
                    contract_type: t.type,
                    entry_spot: t.entry,
                    exit_spot: t.exit,
                    stake: Number(t.stake),
                    profit: t.pnl,
                    status: t.status,
                  }))}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
