"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Play, Square, TrendingUp, TrendingDown, Activity, DollarSign } from "lucide-react"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { DerivAPIClient } from "@/lib/deriv-api"
import { extractLastDigit } from "@/lib/deriv-markets"

interface MarketData {
  symbol: string
  displayName: string
  lastPrice: number
  lastDigit: number
  tickCount: number
  digitFrequencies: Record<number, number>
  evenCount: number
  oddCount: number
  overCounts: Record<number, number>
  underCounts: Record<number, number>
  isActive: boolean
}

interface BotConfig {
  enabled: boolean
  strategy: "even" | "odd" | "over" | "under" | "differs"
  threshold: number
  stake: number
  duration: number
  cooldown: number
  martingale: boolean
  martingaleMultiplier: number
  maxStake: number
  targetDigit?: number
}

interface TradeResult {
  id: string
  market: string
  strategy: string
  contractId?: number
  buyPrice: number
  payout: number
  profit?: number
  status: "pending" | "won" | "lost"
  timestamp: number
}

export function AutoTraderTab() {
  const { token, isLoggedIn, balance: authBalance, accountType, connectionStatus } = useDerivAuth()

  const [markets, setMarkets] = useState<Map<string, MarketData>>(new Map())
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([])
  const [botConfigs, setBotConfigs] = useState<Map<string, BotConfig>>(new Map())
  const [isRunning, setIsRunning] = useState(false)
  const [trades, setTrades] = useState<TradeResult[]>([])
  const [currency, setCurrency] = useState<string>("USD")
  const [totalProfit, setTotalProfit] = useState<number>(0)
  const [winRate, setWinRate] = useState<number>(0)
  const [maxDailyLoss, setMaxDailyLoss] = useState<number>(100)
  const [maxConsecutiveLosses, setMaxConsecutiveLosses] = useState<number>(3)
  const [tickWindow, setTickWindow] = useState<number>(100)

  const apiRef = useRef<DerivAPIClient | null>(null)
  const tickSubscriptions = useRef<Map<string, string>>(new Map())
  const consecutiveLosses = useRef<number>(0)
  const dailyLoss = useRef<number>(0)

  useEffect(() => {
    if (!isLoggedIn || !token) return

    const initializeAPI = async () => {
      try {
        const api = new DerivAPIClient({ appId: "106629" })
        await api.connect()
        await api.authorize(token)

        const balanceData = await api.getBalance()
        setCurrency(balanceData.currency)

        const symbols = await api.getActiveSymbols()
        const digitMarkets = symbols.filter(
          (s: any) =>
            s.symbol.startsWith("R_") ||
            s.symbol.startsWith("1HZ") ||
            (s.market === "synthetic_index" && s.submarket === "random_index"),
        )

        const marketsMap = new Map<string, MarketData>()
        digitMarkets.forEach((s: any) => {
          marketsMap.set(s.symbol, {
            symbol: s.symbol,
            displayName: s.display_name || s.symbol,
            lastPrice: 0,
            lastDigit: 0,
            tickCount: 0,
            digitFrequencies: {},
            evenCount: 0,
            oddCount: 0,
            overCounts: {},
            underCounts: {},
            isActive: false,
          })
        })

        setMarkets(marketsMap)
        apiRef.current = api

        console.log("[v0] AutoTrader initialized with", digitMarkets.length, "markets")
      } catch (error: any) {
        console.error("[v0] AutoTrader init error:", error)
      }
    }

    initializeAPI()

    return () => {
      if (apiRef.current) {
        apiRef.current.disconnect()
      }
    }
  }, [token, isLoggedIn])

  const subscribeToMarket = async (symbol: string) => {
    if (!apiRef.current || tickSubscriptions.current.has(symbol)) return

    try {
      const subId = await apiRef.current.subscribeTicks(symbol, (tick) => {
        setMarkets((prev) => {
          const updated = new Map(prev)
          const market = updated.get(symbol)
          if (!market) return prev

          const digit = extractLastDigit(tick.quote, symbol)

          market.lastPrice = tick.quote
          market.lastDigit = digit
          market.tickCount++
          market.isActive = true

          market.digitFrequencies[digit] = (market.digitFrequencies[digit] || 0) + 1

          if (digit % 2 === 0) {
            market.evenCount++
          } else {
            market.oddCount++
          }

          for (let i = 0; i <= 9; i++) {
            if (digit > i) {
              market.overCounts[i] = (market.overCounts[i] || 0) + 1
            }
            if (digit < i) {
              market.underCounts[i] = (market.underCounts[i] || 0) + 1
            }
          }

          if (market.tickCount > tickWindow) {
            const oldestDigit = Math.floor(Math.random() * 10)
            market.digitFrequencies[oldestDigit] = Math.max(0, (market.digitFrequencies[oldestDigit] || 0) - 1)
          }

          return updated
        })

        checkBotSignals(symbol)
      })

      tickSubscriptions.current.set(symbol, subId)
    } catch (error) {
      console.error("[v0] Tick subscription error:", error)
    }
  }

  const unsubscribeFromMarket = async (symbol: string) => {
    const subId = tickSubscriptions.current.get(symbol)
    if (subId && apiRef.current) {
      try {
        await apiRef.current.forget(subId)
        tickSubscriptions.current.delete(symbol)
      } catch (error) {
        console.error("[v0] Unsubscribe error:", error)
      }
    }
  }

  const checkBotSignals = (symbol: string) => {
    if (!isRunning) return

    const market = markets.get(symbol)
    const config = botConfigs.get(symbol)

    if (!market || !config || !config.enabled || market.tickCount < 25) return

    if (dailyLoss.current >= maxDailyLoss || consecutiveLosses.current >= maxConsecutiveLosses) {
      console.log("[v0] AutoTrader safety limits reached")
      return
    }

    const totalTicks = market.tickCount
    let shouldTrade = false
    let contractType = ""
    let barrier: number | undefined

    if (config.strategy === "even") {
      const evenPercentage = (market.evenCount / totalTicks) * 100
      if (evenPercentage >= config.threshold) {
        shouldTrade = true
        contractType = "DIGITEVEN"
      }
    } else if (config.strategy === "odd") {
      const oddPercentage = (market.oddCount / totalTicks) * 100
      if (oddPercentage >= config.threshold) {
        shouldTrade = true
        contractType = "DIGITODD"
      }
    } else if (config.strategy === "over" && config.targetDigit !== undefined) {
      const overCount = market.overCounts[config.targetDigit] || 0
      const overPercentage = (overCount / totalTicks) * 100
      if (overPercentage >= config.threshold) {
        shouldTrade = true
        contractType = "DIGITOVER"
        barrier = config.targetDigit
      }
    } else if (config.strategy === "under" && config.targetDigit !== undefined) {
      const underCount = market.underCounts[config.targetDigit] || 0
      const underPercentage = (underCount / totalTicks) * 100
      if (underPercentage >= config.threshold) {
        shouldTrade = true
        contractType = "DIGITUNDER"
        barrier = config.targetDigit
      }
    } else if (config.strategy === "differs") {
      const frequencies = Object.values(market.digitFrequencies)
      const maxFreq = Math.max(...frequencies)
      const dominance = (maxFreq / totalTicks) * 100
      if (dominance >= config.threshold) {
        const dominantDigit = Object.keys(market.digitFrequencies).find(
          (k) => market.digitFrequencies[Number.parseInt(k)] === maxFreq,
        )
        shouldTrade = true
        contractType = "DIGITDIFF"
        barrier = Number.parseInt(dominantDigit || "5")
      }
    }

    if (shouldTrade) {
      executeTrade(symbol, contractType, barrier, config)
    }
  }

  const executeTrade = async (symbol: string, contractType: string, barrier: number | undefined, config: BotConfig) => {
    if (!apiRef.current) return

    const currentStake =
      config.martingale && consecutiveLosses.current > 0
        ? Math.min(config.stake * Math.pow(config.martingaleMultiplier, consecutiveLosses.current), config.maxStake)
        : config.stake

    try {
      const proposal = await apiRef.current.getProposal({
        symbol,
        contract_type: contractType,
        amount: currentStake,
        duration: config.duration,
        duration_unit: "t",
        barrier,
        currency,
      })

      const buyResult = await apiRef.current.buyContract(proposal.id)

      const trade: TradeResult = {
        id: `${buyResult.contract_id}_${Date.now()}`,
        market: symbol,
        strategy: config.strategy,
        contractId: buyResult.contract_id,
        buyPrice: buyResult.buy_price,
        payout: buyResult.payout,
        status: "pending",
        timestamp: Date.now(),
      }

      setTrades((prev) => [trade, ...prev])

      apiRef.current.subscribeToContract(buyResult.contract_id, (contract) => {
        if (contract.is_sold || contract.is_expired) {
          const profit = contract.profit || 0
          const won = profit > 0

          setTrades((prev) =>
            prev.map((t) =>
              t.contractId === buyResult.contract_id ? { ...t, profit, status: won ? "won" : "lost" } : t,
            ),
          )

          if (won) {
            consecutiveLosses.current = 0
            setTotalProfit((prev) => prev + profit)
          } else {
            consecutiveLosses.current++
            dailyLoss.current += Math.abs(profit)
            setTotalProfit((prev) => prev + profit)
          }

          updateWinRate()
        }
      })

      await new Promise((resolve) => setTimeout(resolve, config.cooldown * 1000))
    } catch (error: any) {
      console.error("[v0] Trade execution error:", error)
    }
  }

  const updateWinRate = () => {
    const completedTrades = trades.filter((t) => t.status !== "pending")
    if (completedTrades.length > 0) {
      const wins = completedTrades.filter((t) => t.status === "won").length
      setWinRate((wins / completedTrades.length) * 100)
    }
  }

  const toggleMarket = (symbol: string) => {
    setSelectedMarkets((prev) => {
      if (prev.includes(symbol)) {
        unsubscribeFromMarket(symbol)
        return prev.filter((s) => s !== symbol)
      } else {
        subscribeToMarket(symbol)
        return [...prev, symbol]
      }
    })
  }

  const updateBotConfig = (symbol: string, updates: Partial<BotConfig>) => {
    setBotConfigs((prev) => {
      const updated = new Map(prev)
      const current = updated.get(symbol) || {
        enabled: false,
        strategy: "even" as const,
        threshold: 55,
        stake: 1,
        duration: 5,
        cooldown: 10,
        martingale: false,
        martingaleMultiplier: 2,
        maxStake: 10,
      }
      updated.set(symbol, { ...current, ...updates })
      return updated
    })
  }

  const startAutoTrader = () => {
    if (selectedMarkets.length === 0) {
      alert("Please select at least one market")
      return
    }

    setIsRunning(true)
    dailyLoss.current = 0
    consecutiveLosses.current = 0
    console.log("[v0] AutoTrader started")
  }

  const stopAutoTrader = () => {
    setIsRunning(false)
    console.log("[v0] AutoTrader stopped")
  }

  const emergencyStop = () => {
    stopAutoTrader()
    selectedMarkets.forEach((symbol) => unsubscribeFromMarket(symbol))
    setSelectedMarkets([])
    console.log("[v0] AutoTrader EMERGENCY STOP")
  }

  if (!isLoggedIn) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 border-blue-500/30">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-orange-400">
            <AlertCircle className="h-5 w-5" />
            <p>Please log in with your Deriv account to use AutoTrader</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const balance = authBalance?.amount || 0

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 border-blue-500/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-orange-400">
            AutoTrader - Fully Automated Digit Trading
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-slate-800/50 border-blue-500/30">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Balance</p>
                    <p className="text-xl font-bold text-blue-400">
                      {balance.toFixed(2)} {authBalance?.currency || currency}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-400/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-orange-500/30">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Profit</p>
                    <p className={`text-xl font-bold ${totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {totalProfit.toFixed(2)}
                    </p>
                  </div>
                  {totalProfit >= 0 ? (
                    <TrendingUp className="h-8 w-8 text-green-400/50" />
                  ) : (
                    <TrendingDown className="h-8 w-8 text-red-400/50" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-blue-500/30">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Win Rate</p>
                    <p className="text-xl font-bold text-blue-400">{winRate.toFixed(1)}%</p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-400/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-orange-500/30">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Active Bots</p>
                    <p className="text-xl font-bold text-orange-400">{selectedMarkets.length}</p>
                  </div>
                  <Activity className="h-8 w-8 text-orange-400/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-3 mb-6">
            {!isRunning ? (
              <Button
                onClick={startAutoTrader}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                <Play className="h-4 w-4 mr-2" />
                Start AutoTrader
              </Button>
            ) : (
              <Button
                onClick={stopAutoTrader}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop AutoTrader
              </Button>
            )}

            <Button
              onClick={emergencyStop}
              variant="destructive"
              className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600"
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Emergency Stop
            </Button>
          </div>

          <Tabs defaultValue="markets" className="w-full">
            <TabsList className="bg-slate-800/50">
              <TabsTrigger value="markets">Markets & Bots</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="trades">Trade History</TabsTrigger>
            </TabsList>

            <TabsContent value="markets" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Array.from(markets.entries()).map(([symbol, market]) => {
                  const config = botConfigs.get(symbol) || {
                    enabled: false,
                    strategy: "even" as const,
                    threshold: 55,
                    stake: 1,
                    duration: 5,
                    cooldown: 10,
                    martingale: false,
                    martingaleMultiplier: 2,
                    maxStake: 10,
                  }

                  return (
                    <Card
                      key={symbol}
                      className={`border-2 transition-all ${
                        selectedMarkets.includes(symbol)
                          ? "border-orange-500 bg-orange-500/5 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                          : "border-slate-700 bg-slate-800/30"
                      }`}
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg text-blue-400">{market.displayName}</CardTitle>
                            <p className="text-sm text-gray-400">{symbol}</p>
                          </div>
                          <Switch
                            checked={selectedMarkets.includes(symbol)}
                            onCheckedChange={() => toggleMarket(symbol)}
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {market.isActive && (
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-gray-400">Last Price</p>
                              <p className="text-white font-mono">{market.lastPrice.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Last Digit</p>
                              <Badge variant="outline" className="text-lg font-bold text-orange-400 border-orange-400">
                                {market.lastDigit}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-gray-400">Even</p>
                              <p className="text-white">
                                {market.tickCount > 0 ? ((market.evenCount / market.tickCount) * 100).toFixed(1) : 0}%
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Odd</p>
                              <p className="text-white">
                                {market.tickCount > 0 ? ((market.oddCount / market.tickCount) * 100).toFixed(1) : 0}%
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedMarkets.includes(symbol) && (
                          <div className="space-y-3 pt-3 border-t border-slate-700">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={config.enabled}
                                onCheckedChange={(enabled) => updateBotConfig(symbol, { enabled })}
                              />
                              <Label className="text-sm">Enable Bot</Label>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">Strategy</Label>
                              <Select
                                value={config.strategy}
                                onValueChange={(strategy: any) => updateBotConfig(symbol, { strategy })}
                              >
                                <SelectTrigger className="bg-slate-900/50">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="even">Even</SelectItem>
                                  <SelectItem value="odd">Odd</SelectItem>
                                  <SelectItem value="over">Over</SelectItem>
                                  <SelectItem value="under">Under</SelectItem>
                                  <SelectItem value="differs">Differs</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {(config.strategy === "over" || config.strategy === "under") && (
                              <div className="space-y-2">
                                <Label className="text-xs">Target Digit</Label>
                                <Select
                                  value={String(config.targetDigit || 5)}
                                  onValueChange={(targetDigit) =>
                                    updateBotConfig(symbol, { targetDigit: Number.parseInt(targetDigit) })
                                  }
                                >
                                  <SelectTrigger className="bg-slate-900/50">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {config.strategy === "over" && (
                                      <>
                                        <SelectItem value="1">Over 1 (2-9)</SelectItem>
                                        <SelectItem value="2">Over 2 (3-9)</SelectItem>
                                        <SelectItem value="3">Over 3 (4-9)</SelectItem>
                                      </>
                                    )}
                                    {config.strategy === "under" && (
                                      <>
                                        <SelectItem value="6">Under 6 (0-5)</SelectItem>
                                        <SelectItem value="7">Under 7 (0-6)</SelectItem>
                                        <SelectItem value="8">Under 8 (0-7)</SelectItem>
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-2">
                                <Label className="text-xs">Threshold %</Label>
                                <Input
                                  type="number"
                                  value={config.threshold}
                                  onChange={(e) =>
                                    updateBotConfig(symbol, { threshold: Number.parseFloat(e.target.value) })
                                  }
                                  className="bg-slate-900/50"
                                  min={50}
                                  max={90}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Stake</Label>
                                <Input
                                  type="number"
                                  value={config.stake}
                                  onChange={(e) =>
                                    updateBotConfig(symbol, { stake: Number.parseFloat(e.target.value) })
                                  }
                                  className="bg-slate-900/50"
                                  min={0.35}
                                  step={0.1}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                              <Switch
                                checked={config.martingale}
                                onCheckedChange={(martingale) => updateBotConfig(symbol, { martingale })}
                              />
                              <Label className="text-xs">Martingale</Label>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card className="bg-slate-800/30 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-blue-400">Risk Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Max Daily Loss ({currency})</Label>
                    <Input
                      type="number"
                      value={maxDailyLoss}
                      onChange={(e) => setMaxDailyLoss(Number.parseFloat(e.target.value))}
                      className="bg-slate-900/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Max Consecutive Losses</Label>
                    <Input
                      type="number"
                      value={maxConsecutiveLosses}
                      onChange={(e) => setMaxConsecutiveLosses(Number.parseInt(e.target.value))}
                      className="bg-slate-900/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tick Window Size</Label>
                    <Select value={String(tickWindow)} onValueChange={(v) => setTickWindow(Number.parseInt(v))}>
                      <SelectTrigger className="bg-slate-900/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25 ticks</SelectItem>
                        <SelectItem value="50">50 ticks</SelectItem>
                        <SelectItem value="100">100 ticks</SelectItem>
                        <SelectItem value="200">200 ticks</SelectItem>
                        <SelectItem value="500">500 ticks</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-4 border-t border-slate-700">
                    <p className="text-xs text-gray-400">
                      <AlertCircle className="inline h-3 w-3 mr-1" />
                      Trading involves risk. Only trade with money you can afford to lose.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trades">
              <Card className="bg-slate-800/30 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-blue-400">Trade History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {trades.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">No trades yet</p>
                    ) : (
                      trades.map((trade) => (
                        <div
                          key={trade.id}
                          className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700"
                        >
                          <div>
                            <p className="font-medium text-white">{trade.market}</p>
                            <p className="text-xs text-gray-400">
                              {trade.strategy.toUpperCase()} • {new Date(trade.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                trade.status === "won" ? "default" : trade.status === "lost" ? "destructive" : "outline"
                              }
                              className={
                                trade.status === "won"
                                  ? "bg-green-500"
                                  : trade.status === "lost"
                                    ? "bg-red-500"
                                    : "bg-yellow-500"
                              }
                            >
                              {trade.status}
                            </Badge>
                            {trade.profit !== undefined && (
                              <p
                                className={`text-sm font-bold ${trade.profit >= 0 ? "text-green-400" : "text-red-400"}`}
                              >
                                {trade.profit >= 0 ? "+" : ""}
                                {trade.profit.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
