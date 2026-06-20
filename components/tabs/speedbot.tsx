"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Zap, Square, RotateCcw } from "lucide-react"
import { TradingStatsPanel } from "@/components/trading-stats-panel"
import { TransactionHistory } from "@/components/transaction-history"
import { TradingJournalPanel } from "@/components/trading-journal-panel"
import { TPSLModal } from "@/components/tp-sl-modal"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { DerivAPIClient } from "@/lib/deriv-api"

interface SharedConfig {
  symbol: string
  tradeType: string
  contractType: string
  barrier: string
  barrier2: string
  stake: number
  duration: number
  durationUnit: "t" | "s" | "m" | "h" | "d"
  martingale: number
  stopLoss: number
  takeProfit: number
}

interface SpeedBotProps {
  theme: string
  activeSymbols: any[]
  loadingMarkets: boolean
  config: SharedConfig
  onConfigChange: (updates: Partial<SharedConfig>) => void
  currentTick: number | null
  currentDigit: number
}

interface TradeRecord {
  id: string
  contractType: string
  market: string
  entry: string
  stake: number
  pl: number
  payout: number
  timestamp: number
  entrySpot?: string
  exitSpot?: string
  lastDigit?: number
}

interface LogEntry {
  time: string
  message: string
  type: "info" | "success" | "error" | "warn"
}

interface BotStats {
  totalWins: number
  totalLosses: number
  totalProfit: number
  winRate: number
  totalStake: number
  totalPayout: number
  numberOfRuns: number
  contractsLost: number
  contractsWon: number
}

const TRADE_TYPES = {
  DIGITS: {
    label: "Digits",
    contracts: [
      { value: "DIGITEVEN", label: "Even", requiresBarrier: false },
      { value: "DIGITODD", label: "Odd", requiresBarrier: false },
      { value: "DIGITOVER", label: "Over", requiresBarrier: true, barrierType: "digit" },
      { value: "DIGITUNDER", label: "Under", requiresBarrier: true, barrierType: "digit" },
      { value: "DIGITMATCH", label: "Matches", requiresBarrier: true, barrierType: "digit" },
      { value: "DIGITDIFF", label: "Differs", requiresBarrier: true, barrierType: "digit" },
    ],
  },
  RISE_FALL: {
    label: "Rise/Fall",
    contracts: [
      { value: "CALL", label: "Rise", requiresBarrier: false },
      { value: "PUT", label: "Fall", requiresBarrier: false },
    ],
  },
}

function groupSymbolsByMarket(symbols: any[]) {
  const groups: Record<string, any[]> = {}
  symbols.forEach((s) => {
    const market = s.market_display_name || s.market || "Other"
    if (!groups[market]) groups[market] = []
    groups[market].push(s)
  })
  return groups
}

export function SpeedBot({
  theme,
  activeSymbols,
  loadingMarkets,
  config,
  onConfigChange,
  currentTick,
  currentDigit,
}: SpeedBotProps) {
  const { token, isLoggedIn, balance: authBalance } = useDerivAuth()

  const apiClientRef = useRef<DerivAPIClient | null>(null)
  const isRunningRef = useRef(false)
  const currentStakeRef = useRef(config.stake)
  const statsRef = useRef<BotStats>({
    totalWins: 0,
    totalLosses: 0,
    totalProfit: 0,
    winRate: 0,
    totalStake: 0,
    totalPayout: 0,
    numberOfRuns: 0,
    contractsLost: 0,
    contractsWon: 0,
  })
  const tickWsRef = useRef<WebSocket | null>(null)
  const pendingTradeRef = useRef(false)

  const [isRunning, setIsRunning] = useState(false)
  const [botStatus, setBotStatus] = useState("Idle")
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([])
  const [journalLog, setJournalLog] = useState<LogEntry[]>([])
  const [activeSubTab, setActiveSubTab] = useState("stats")
  const [stats, setStats] = useState<BotStats>(statsRef.current)
  const [tpslModal, setTPSLModal] = useState<{ isOpen: boolean; type: "tp" | "sl"; amount: number }>({
    isOpen: false,
    type: "tp",
    amount: 0,
  })

  // Live tick data
  const [ticksPerSecond, setTicksPerSecond] = useState(0)
  const [last15Digits, setLast15Digits] = useState<number[]>([])
  const tickTimestampsRef = useRef<number[]>([])

  // Initialize API client
  useEffect(() => {
    if (!token || !isLoggedIn) return

    const initAPI = async () => {
      try {
        const client = new DerivAPIClient({ token })
        await client.connect()
        await client.authorize(token)
        apiClientRef.current = client
        console.log("[v0] SpeedBot API connected")
      } catch (error) {
        console.error("[v0] SpeedBot API error:", error)
      }
    }

    initAPI()

    return () => {
      if (apiClientRef.current) {
        apiClientRef.current.disconnect()
      }
    }
  }, [token, isLoggedIn])

  const logJournal = useCallback((message: string, type: "info" | "success" | "error" | "warn" = "info") => {
    const time = new Date().toLocaleTimeString()
    setJournalLog((prev) => [{ time, message, type }, ...prev].slice(0, 200))
  }, [])

  const currentContract = (() => {
    const tradeType = config.tradeType as keyof typeof TRADE_TYPES
    return TRADE_TYPES[tradeType]?.contracts.find((c) => c.value === config.contractType)
  })()

  const requiresBarrier = currentContract?.requiresBarrier || false
  const barrierType = currentContract?.barrierType

  useEffect(() => {
    const tradeType = config.tradeType as keyof typeof TRADE_TYPES
    const contracts = TRADE_TYPES[tradeType]?.contracts
    if (contracts && contracts.length > 0 && !contracts.find((c) => c.value === config.contractType)) {
      onConfigChange({ contractType: contracts[0].value, barrier: "5", barrier2: "" })
    }
  }, [config.tradeType])

  const groupedSymbols = groupSymbolsByMarket(activeSymbols)

  // Update tick rate
  const updateTickRate = useCallback(() => {
    const now = Date.now()
    tickTimestampsRef.current.push(now)
    tickTimestampsRef.current = tickTimestampsRef.current.filter((t) => now - t < 1000)
    setTicksPerSecond(tickTimestampsRef.current.length)
  }, [])

  // Execute trade on tick - zero-skip execution
  const executeTradeOnTick = useCallback(
    async (digit: number) => {
      if (!apiClientRef.current || !isRunningRef.current || pendingTradeRef.current) return

      pendingTradeRef.current = true
      const tradeStake = currentStakeRef.current

      try {
        const proposalRequest: any = {
          proposal: 1,
          symbol: config.symbol,
          contract_type: config.contractType,
          amount: tradeStake,
          basis: "stake",
          duration: 1,
          duration_unit: "t",
          currency: "USD",
        }

        if (requiresBarrier && barrierType === "digit") {
          proposalRequest.barrier = config.barrier
        }

        const proposalResponse = await apiClientRef.current.send(proposalRequest)
        if (proposalResponse.error) {
          logJournal(`Proposal error: ${proposalResponse.error.message}`, "error")
          pendingTradeRef.current = false
          return
        }

        const proposal = proposalResponse.proposal

        // Buy immediately - async non-blocking
        const buyResponse = await apiClientRef.current.send({
          buy: proposal.id,
          price: proposal.ask_price,
        })

        if (buyResponse.error) {
          logJournal(`Buy error: ${buyResponse.error.message}`, "error")
          pendingTradeRef.current = false
          return
        }

        const contractId = buyResponse.buy.contract_id
        logJournal(`Trade #${contractId} placed @ $${tradeStake.toFixed(2)}`, "info")

        // Wait for settlement in background
        const checkSettlement = async () => {
          try {
            const pocResponse = await apiClientRef.current?.send({
              proposal_open_contract: 1,
              contract_id: contractId,
            })

            if (pocResponse?.proposal_open_contract) {
              const contract = pocResponse.proposal_open_contract

              if (contract.is_sold || contract.is_expired || contract.status !== "open") {
                const profit = contract.profit || 0
                const isWin = profit > 0

                // Update stats
                statsRef.current.numberOfRuns++
                statsRef.current.totalStake += tradeStake

                if (isWin) {
                  statsRef.current.totalWins++
                  statsRef.current.contractsWon++
                  statsRef.current.totalPayout += contract.payout || 0
                  logJournal(`WIN #${contractId}: +$${profit.toFixed(2)}`, "success")
                  currentStakeRef.current = config.stake
                } else {
                  statsRef.current.totalLosses++
                  statsRef.current.contractsLost++
                  logJournal(`LOSS #${contractId}: -$${Math.abs(profit).toFixed(2)}`, "error")
                  currentStakeRef.current = Math.min(currentStakeRef.current * config.martingale, authBalance * 0.5)
                }

                statsRef.current.totalProfit += profit
                statsRef.current.winRate =
                  statsRef.current.numberOfRuns > 0
                    ? (statsRef.current.totalWins / statsRef.current.numberOfRuns) * 100
                    : 0

                setStats({ ...statsRef.current })

                // Add to history
                setTradeHistory((prev) =>
                  [
                    {
                      id: contractId.toString(),
                      contractType: config.contractType,
                      market: config.symbol,
                      entry: new Date().toLocaleTimeString(),
                      stake: tradeStake,
                      pl: profit,
                      payout: contract.payout || 0,
                      timestamp: Date.now(),
                      entrySpot: contract.entry_spot?.toString(),
                      exitSpot: contract.exit_spot?.toString(),
                      lastDigit: digit,
                    },
                    ...prev,
                  ].slice(0, 100),
                )

                // Check TP/SL
                if (statsRef.current.totalProfit >= config.takeProfit) {
                  logJournal(`TAKE PROFIT: +$${statsRef.current.totalProfit.toFixed(2)}`, "success")
                  setTPSLModal({ isOpen: true, type: "tp", amount: statsRef.current.totalProfit })
                  isRunningRef.current = false
                  setIsRunning(false)
                  setBotStatus("Take Profit Reached")
                } else if (statsRef.current.totalProfit <= -config.stopLoss) {
                  logJournal(`STOP LOSS: -$${Math.abs(statsRef.current.totalProfit).toFixed(2)}`, "error")
                  setTPSLModal({ isOpen: true, type: "sl", amount: Math.abs(statsRef.current.totalProfit) })
                  isRunningRef.current = false
                  setIsRunning(false)
                  setBotStatus("Stop Loss Reached")
                }

                pendingTradeRef.current = false
                return
              }
            }

            // Continue checking
            if (isRunningRef.current) {
              setTimeout(checkSettlement, 100)
            } else {
              pendingTradeRef.current = false
            }
          } catch (err) {
            if (isRunningRef.current) {
              setTimeout(checkSettlement, 100)
            } else {
              pendingTradeRef.current = false
            }
          }
        }

        checkSettlement()
      } catch (error: any) {
        logJournal(`Trade error: ${error.message}`, "error")
        pendingTradeRef.current = false
      }
    },
    [config, requiresBarrier, barrierType, authBalance, logJournal],
  )

  // Set up tick subscription for SpeedBot - executes on every tick
  useEffect(() => {
    if (!config.symbol || !isRunning) return

    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=106629`)
    tickWsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ ticks: config.symbol, subscribe: 1 }))
      logJournal(`SpeedBot subscribed to ${config.symbol}`, "info")
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.tick && isRunningRef.current) {
        const tick = data.tick
        const price = tick.quote
        const priceStr = price.toString()
        const decimalPart = priceStr.split(".")[1] || "0"
        const digit = Number.parseInt(decimalPart.slice(-1))

        setLast15Digits((prev) => [digit, ...prev].slice(0, 15))
        updateTickRate()

        // Execute trade on every tick - zero-skip
        if (!pendingTradeRef.current) {
          executeTradeOnTick(digit)
        }
      }
    }

    ws.onerror = () => {
      logJournal("Tick subscription error", "error")
    }

    return () => {
      if (tickWsRef.current) {
        tickWsRef.current.close()
        tickWsRef.current = null
      }
    }
  }, [config.symbol, isRunning, executeTradeOnTick, updateTickRate, logJournal])

  const startBot = useCallback(() => {
    if (!isLoggedIn || !apiClientRef.current) {
      logJournal("Please log in first", "error")
      return
    }

    isRunningRef.current = true
    currentStakeRef.current = config.stake
    pendingTradeRef.current = false
    setIsRunning(true)
    setBotStatus("Running - Every Tick")
    logJournal(`SpeedBot started on ${config.symbol} - Zero-skip mode`, "info")
  }, [isLoggedIn, config.stake, config.symbol, logJournal])

  const stopBot = useCallback(() => {
    isRunningRef.current = false
    setIsRunning(false)
    setBotStatus("Stopped")
    logJournal("SpeedBot stopped", "info")
  }, [logJournal])

  const toggleBot = useCallback(() => {
    if (isRunning) {
      stopBot()
    } else {
      startBot()
    }
  }, [isRunning, startBot, stopBot])

  const resetStats = useCallback(() => {
    statsRef.current = {
      totalWins: 0,
      totalLosses: 0,
      totalProfit: 0,
      winRate: 0,
      totalStake: 0,
      totalPayout: 0,
      numberOfRuns: 0,
      contractsLost: 0,
      contractsWon: 0,
    }
    setStats({ ...statsRef.current })
    setTradeHistory([])
    setJournalLog([])
    setLast15Digits([])
    currentStakeRef.current = config.stake
    logJournal("Stats reset", "info")
  }, [config.stake, logJournal])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRunningRef.current = false
      if (tickWsRef.current) {
        tickWsRef.current.close()
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      <TPSLModal
        isOpen={tpslModal.isOpen}
        type={tpslModal.type}
        amount={tpslModal.amount}
        currency="USD"
        onClose={() => setTPSLModal({ ...tpslModal, isOpen: false })}
      />

      {/* Live Tick Display */}
      <div
        className={`p-4 rounded-lg border ${theme === "dark" ? "bg-[#0a0e27]/50 border-purple-500/20" : "bg-gray-50 border-gray-200"}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              SpeedBot - Zero-Skip Execution
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={`${ticksPerSecond > 0 ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}
            >
              {ticksPerSecond} ticks/sec
            </Badge>
            <Badge
              className={`${
                botStatus === "Idle"
                  ? "bg-gray-500/20 text-gray-400"
                  : botStatus.includes("Running")
                    ? "bg-purple-500/20 text-purple-400 animate-pulse"
                    : "bg-yellow-500/20 text-yellow-400"
              }`}
            >
              {botStatus}
            </Badge>
          </div>
        </div>

        {/* Last 15 Digits */}
        <div className="mt-2">
          <p className={`text-xs mb-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Last 15 Digits</p>
          <div className="flex gap-1 flex-wrap">
            {last15Digits.length === 0 ? (
              <span className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                Start bot to see digits...
              </span>
            ) : (
              last15Digits.map((digit, i) => (
                <span
                  key={i}
                  className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold ${
                    i === 0 ? "ring-2 ring-yellow-400" : ""
                  } ${digit % 2 === 0 ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}
                >
                  {digit}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Configuration Panel */}
      <div
        className={`p-4 rounded-lg border ${theme === "dark" ? "bg-[#0a0e27]/50 border-purple-500/20" : "bg-gray-50 border-gray-200"}`}
      >
        <h3 className={`text-sm font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          SpeedBot Configuration
        </h3>

        <div className="space-y-3">
          {/* Market Selection */}
          <div>
            <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              Market Symbol
            </Label>
            <Select
              value={config.symbol}
              onValueChange={(val) => onConfigChange({ symbol: val })}
              disabled={loadingMarkets || isRunning}
            >
              <SelectTrigger
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-purple-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              >
                <SelectValue placeholder={loadingMarkets ? "Loading..." : "Select market"} />
              </SelectTrigger>
              <SelectContent
                className={`max-h-80 ${theme === "dark" ? "bg-[#0a0e27] border-purple-500/30" : "bg-white"}`}
              >
                {Object.entries(groupedSymbols).map(([market, symbols]) => (
                  <div key={market}>
                    <div
                      className={`px-2 py-1 text-xs font-bold ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {market}
                    </div>
                    {symbols.map((s: any) => (
                      <SelectItem key={s.symbol} value={s.symbol} className="text-xs">
                        {s.display_name || s.symbol}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Trade Type */}
          <div>
            <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              Trade Type
            </Label>
            <Select
              value={config.tradeType}
              onValueChange={(val) => onConfigChange({ tradeType: val })}
              disabled={isRunning}
            >
              <SelectTrigger
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-purple-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-purple-500/30" : "bg-white"}>
                {Object.entries(TRADE_TYPES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contract Type */}
          <div>
            <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              Contract Type
            </Label>
            <Select
              value={config.contractType}
              onValueChange={(val) => onConfigChange({ contractType: val })}
              disabled={isRunning}
            >
              <SelectTrigger
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-purple-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-purple-500/30" : "bg-white"}>
                {TRADE_TYPES[config.tradeType as keyof typeof TRADE_TYPES]?.contracts.map((contract) => (
                  <SelectItem key={contract.value} value={contract.value} className="text-xs">
                    {contract.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {requiresBarrier && barrierType === "digit" && (
              <div>
                <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  Prediction (0-9)
                </Label>
                <Select
                  value={config.barrier}
                  onValueChange={(val) => onConfigChange({ barrier: val })}
                  disabled={isRunning}
                >
                  <SelectTrigger
                    className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-purple-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-purple-500/30" : "bg-white"}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <SelectItem key={n} value={n.toString()} className="text-xs">
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Initial Stake ($)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0.35"
                value={config.stake}
                onChange={(e) => onConfigChange({ stake: Number.parseFloat(e.target.value) || 0.35 })}
                disabled={isRunning}
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-purple-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              />
            </div>

            <div>
              <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Martingale
              </Label>
              <Input
                type="number"
                step="0.1"
                min="1"
                value={config.martingale}
                onChange={(e) => onConfigChange({ martingale: Number.parseFloat(e.target.value) || 1 })}
                disabled={isRunning}
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-purple-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              />
            </div>

            <div>
              <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Stop Loss ($)
              </Label>
              <Input
                type="number"
                min="1"
                value={config.stopLoss}
                onChange={(e) => onConfigChange({ stopLoss: Number.parseInt(e.target.value) || 50 })}
                disabled={isRunning}
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-purple-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              />
            </div>

            <div>
              <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Take Profit ($)
              </Label>
              <Input
                type="number"
                min="1"
                value={config.takeProfit}
                onChange={(e) => onConfigChange({ takeProfit: Number.parseInt(e.target.value) || 100 })}
                disabled={isRunning}
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-purple-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Start/Stop Button */}
      <div className="flex gap-2">
        <Button
          onClick={toggleBot}
          disabled={!isLoggedIn}
          className={`flex-1 h-12 text-sm font-bold ${isRunning ? "bg-red-500 hover:bg-red-600" : "bg-purple-500 hover:bg-purple-600"}`}
        >
          {isRunning ? (
            <>
              <Square className="w-4 h-4 mr-2" />
              Stop SpeedBot
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Start SpeedBot
            </>
          )}
        </Button>
        <Button
          onClick={resetStats}
          variant="outline"
          className={`h-12 ${theme === "dark" ? "border-purple-500/30" : ""}`}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats Panel */}
      <TradingStatsPanel stats={stats} theme={theme} onReset={resetStats} />

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className={`grid w-full grid-cols-2 ${theme === "dark" ? "bg-[#0f1629]/50" : "bg-gray-100"}`}>
          <TabsTrigger value="transactions" className="text-xs">
            Transactions
          </TabsTrigger>
          <TabsTrigger value="journal" className="text-xs">
            Journal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-3">
          <TransactionHistory
            transactions={tradeHistory.map((t) => ({
              id: t.id,
              contractType: t.contractType,
              market: t.market,
              entrySpot: t.entrySpot || "N/A",
              exitSpot: t.exitSpot || "N/A",
              buyPrice: t.stake,
              profitLoss: t.pl,
              timestamp: t.timestamp,
              status: t.pl >= 0 ? "win" : "loss",
            }))}
            theme={theme}
          />
        </TabsContent>

        <TabsContent value="journal" className="mt-3">
          <TradingJournalPanel entries={journalLog} theme={theme} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
