"use client"
import { useState, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TradingStatsPanel } from "@/components/trading-stats-panel"
import { TransactionHistory } from "@/components/transaction-history"
import { TradingJournalPanel } from "@/components/trading-journal-panel"
import { TPSLModal } from "@/components/tp-sl-modal"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { DerivAPIClient } from "@/lib/deriv-api"
import { Play, Square } from "lucide-react"

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

interface AutoRunBotProps {
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
  HIGHER_LOWER: {
    label: "Higher/Lower",
    contracts: [
      { value: "CALLE", label: "Higher", requiresBarrier: true, barrierType: "price" },
      { value: "PUTE", label: "Lower", requiresBarrier: true, barrierType: "price" },
    ],
  },
  TOUCH_NO_TOUCH: {
    label: "Touch/No Touch",
    contracts: [
      { value: "ONETOUCH", label: "Touch", requiresBarrier: true, barrierType: "price" },
      { value: "NOTOUCH", label: "No Touch", requiresBarrier: true, barrierType: "price" },
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

export function AutoRunBot({
  theme,
  activeSymbols,
  loadingMarkets,
  config,
  onConfigChange,
  currentTick,
  currentDigit,
}: AutoRunBotProps) {
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

  // Initialize API client
  useEffect(() => {
    if (!token || !isLoggedIn) return

    const initAPI = async () => {
      try {
        const client = new DerivAPIClient({ token })
        await client.connect()
        await client.authorize(token)
        apiClientRef.current = client
        console.log("[v0] AutoRunBot API connected")
      } catch (error) {
        console.error("[v0] AutoRunBot API error:", error)
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
  const isRangeContract = barrierType === "range"

  useEffect(() => {
    const tradeType = config.tradeType as keyof typeof TRADE_TYPES
    const contracts = TRADE_TYPES[tradeType]?.contracts
    if (contracts && contracts.length > 0 && !contracts.find((c) => c.value === config.contractType)) {
      onConfigChange({ contractType: contracts[0].value, barrier: "5", barrier2: "" })
    }
  }, [config.tradeType])

  const groupedSymbols = groupSymbolsByMarket(activeSymbols)

  // Execute a single trade and return result
  const executeSingleTrade = useCallback(async (): Promise<{
    isWin: boolean
    profit: number
    payout: number
    contractId: string
    entrySpot?: string
    exitSpot?: string
  } | null> => {
    if (!apiClientRef.current) return null

    const tradeStake = currentStakeRef.current

    try {
      const proposalRequest: any = {
        proposal: 1,
        symbol: config.symbol,
        contract_type: config.contractType,
        amount: tradeStake,
        basis: "stake",
        duration: config.duration,
        duration_unit: config.durationUnit,
        currency: "USD",
      }

      if (requiresBarrier) {
        if (barrierType === "digit") {
          proposalRequest.barrier = config.barrier
        } else if (barrierType === "price") {
          proposalRequest.barrier = `+${config.barrier}`
        }
      }

      const proposalResponse = await apiClientRef.current.send(proposalRequest)
      if (proposalResponse.error) throw new Error(proposalResponse.error.message)

      const proposal = proposalResponse.proposal

      const buyResponse = await apiClientRef.current.send({
        buy: proposal.id,
        price: proposal.ask_price,
      })
      if (buyResponse.error) throw new Error(buyResponse.error.message)

      const contractId = buyResponse.buy.contract_id

      // Wait for settlement
      return new Promise((resolve) => {
        const checkInterval = setInterval(async () => {
          try {
            const pocResponse = await apiClientRef.current?.send({
              proposal_open_contract: 1,
              contract_id: contractId,
            })

            if (pocResponse?.proposal_open_contract) {
              const contract = pocResponse.proposal_open_contract

              if (contract.is_sold || contract.is_expired || contract.status !== "open") {
                clearInterval(checkInterval)
                resolve({
                  isWin: (contract.profit || 0) > 0,
                  profit: contract.profit || 0,
                  payout: contract.payout || 0,
                  contractId: contractId.toString(),
                  entrySpot: contract.entry_spot?.toString(),
                  exitSpot: contract.exit_spot?.toString(),
                })
              }
            }
          } catch (err) {
            // Continue checking
          }
        }, 300)

        setTimeout(() => {
          clearInterval(checkInterval)
          resolve({ isWin: false, profit: -tradeStake, payout: 0, contractId: contractId.toString() })
        }, 30000)
      })
    } catch (error: any) {
      logJournal(`Trade error: ${error.message}`, "error")
      return null
    }
  }, [config, requiresBarrier, barrierType, logJournal])

  // Continuous trading loop
  const runTradingLoop = useCallback(async () => {
    if (!isRunningRef.current) return

    setBotStatus("Executing trade...")

    const result = await executeSingleTrade()

    if (!result) {
      if (isRunningRef.current) {
        setTimeout(runTradingLoop, 1000)
      }
      return
    }

    // Update stats
    statsRef.current.numberOfRuns++
    statsRef.current.totalStake += currentStakeRef.current

    if (result.isWin) {
      statsRef.current.totalWins++
      statsRef.current.contractsWon++
      statsRef.current.totalPayout += result.payout
      logJournal(`WIN #${result.contractId}: +$${result.profit.toFixed(2)}`, "success")
      currentStakeRef.current = config.stake // Reset stake on win
    } else {
      statsRef.current.totalLosses++
      statsRef.current.contractsLost++
      logJournal(`LOSS #${result.contractId}: -$${Math.abs(result.profit).toFixed(2)}`, "error")
      // Apply martingale on loss
      currentStakeRef.current = Math.min(currentStakeRef.current * config.martingale, authBalance * 0.5)
    }

    statsRef.current.totalProfit += result.profit
    statsRef.current.winRate =
      statsRef.current.numberOfRuns > 0 ? (statsRef.current.totalWins / statsRef.current.numberOfRuns) * 100 : 0

    setStats({ ...statsRef.current })

    // Add to history
    setTradeHistory((prev) =>
      [
        {
          id: result.contractId,
          contractType: config.contractType,
          market: config.symbol,
          entry: new Date().toLocaleTimeString(),
          stake: currentStakeRef.current,
          pl: result.profit,
          payout: result.payout,
          timestamp: Date.now(),
          entrySpot: result.entrySpot,
          exitSpot: result.exitSpot,
        },
        ...prev,
      ].slice(0, 100),
    )

    // Check TP/SL
    if (statsRef.current.totalProfit >= config.takeProfit) {
      logJournal(`TAKE PROFIT reached: +$${statsRef.current.totalProfit.toFixed(2)}`, "success")
      setTPSLModal({ isOpen: true, type: "tp", amount: statsRef.current.totalProfit })
      isRunningRef.current = false
      setIsRunning(false)
      setBotStatus("Take Profit Reached")
      return
    }

    if (statsRef.current.totalProfit <= -config.stopLoss) {
      logJournal(`STOP LOSS reached: -$${Math.abs(statsRef.current.totalProfit).toFixed(2)}`, "error")
      setTPSLModal({ isOpen: true, type: "sl", amount: Math.abs(statsRef.current.totalProfit) })
      isRunningRef.current = false
      setIsRunning(false)
      setBotStatus("Stop Loss Reached")
      return
    }

    // Continue trading
    if (isRunningRef.current) {
      setBotStatus(`Running - ${statsRef.current.numberOfRuns} trades`)
      setTimeout(runTradingLoop, 500) // Small delay between trades
    }
  }, [executeSingleTrade, config, authBalance, logJournal])

  const startBot = useCallback(() => {
    if (!isLoggedIn || !apiClientRef.current) {
      logJournal("Please log in first", "error")
      return
    }

    isRunningRef.current = true
    currentStakeRef.current = config.stake
    setIsRunning(true)
    setBotStatus("Starting...")
    logJournal(`AutoRun started on ${config.symbol}`, "info")
    runTradingLoop()
  }, [isLoggedIn, config.stake, config.symbol, logJournal, runTradingLoop])

  const stopBot = useCallback(() => {
    isRunningRef.current = false
    setIsRunning(false)
    setBotStatus("Stopped")
    logJournal("AutoRun stopped by user", "info")
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
    currentStakeRef.current = config.stake
    logJournal("Stats reset", "info")
  }, [config.stake, logJournal])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRunningRef.current = false
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

      {/* Configuration Panel - Same as Manual */}
      <div
        className={`p-4 rounded-lg border ${theme === "dark" ? "bg-[#0a0e27]/50 border-green-500/20" : "bg-gray-50 border-gray-200"}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            AutoRun Configuration
          </h3>
          <span
            className={`text-xs px-2 py-1 rounded ${
              botStatus === "Idle"
                ? "bg-gray-500/20 text-gray-400"
                : botStatus.includes("Running")
                  ? "bg-green-500/20 text-green-400"
                  : botStatus.includes("Reached")
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-red-500/20 text-red-400"
            }`}
          >
            {botStatus}
          </span>
        </div>

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
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-green-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              >
                <SelectValue placeholder={loadingMarkets ? "Loading..." : "Select market"} />
              </SelectTrigger>
              <SelectContent
                className={`max-h-80 ${theme === "dark" ? "bg-[#0a0e27] border-green-500/30" : "bg-white"}`}
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
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-green-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-green-500/30" : "bg-white"}>
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
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-green-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-green-500/30" : "bg-white"}>
                {TRADE_TYPES[config.tradeType as keyof typeof TRADE_TYPES]?.contracts.map((contract) => (
                  <SelectItem key={contract.value} value={contract.value} className="text-xs">
                    {contract.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {requiresBarrier && !isRangeContract && (
              <div>
                <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  {barrierType === "digit" ? "Prediction (0-9)" : "Barrier"}
                </Label>
                {barrierType === "digit" ? (
                  <Select
                    value={config.barrier}
                    onValueChange={(val) => onConfigChange({ barrier: val })}
                    disabled={isRunning}
                  >
                    <SelectTrigger
                      className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-green-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-green-500/30" : "bg-white"}>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <SelectItem key={n} value={n.toString()} className="text-xs">
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="text"
                    value={config.barrier}
                    onChange={(e) => onConfigChange({ barrier: e.target.value })}
                    disabled={isRunning}
                    className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-green-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  />
                )}
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
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-green-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              />
            </div>

            <div>
              <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Duration
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={config.duration}
                  onChange={(e) => onConfigChange({ duration: Number.parseInt(e.target.value) || 1 })}
                  disabled={isRunning}
                  className={`text-xs h-9 flex-1 ${theme === "dark" ? "bg-[#0f1629] border-green-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                />
                <Select
                  value={config.durationUnit}
                  onValueChange={(val: any) => onConfigChange({ durationUnit: val })}
                  disabled={isRunning}
                >
                  <SelectTrigger
                    className={`text-xs h-9 w-16 ${theme === "dark" ? "bg-[#0f1629] border-green-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-green-500/30" : "bg-white"}>
                    <SelectItem value="t" className="text-xs">
                      Ticks
                    </SelectItem>
                    <SelectItem value="s" className="text-xs">
                      Sec
                    </SelectItem>
                    <SelectItem value="m" className="text-xs">
                      Min
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-green-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
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
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-green-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
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
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-green-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Start/Stop Button */}
      <Button
        onClick={toggleBot}
        disabled={!isLoggedIn}
        className={`w-full h-12 text-sm font-bold ${isRunning ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}
      >
        {isRunning ? (
          <>
            <Square className="w-4 h-4 mr-2" />
            Stop AutoRun
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            Start AutoRun
          </>
        )}
      </Button>

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
