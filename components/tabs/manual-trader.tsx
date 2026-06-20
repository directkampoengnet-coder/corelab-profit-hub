"use client"
import { useState, useCallback, useMemo, useEffect, useRef } from "react"
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
import { Play, Loader2 } from "lucide-react"

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

interface ManualTraderProps {
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

// Group symbols by market/submarket
function groupSymbolsByMarket(symbols: any[]) {
  const groups: Record<string, any[]> = {}

  symbols.forEach((s) => {
    const market = s.market_display_name || s.market || "Other"
    if (!groups[market]) groups[market] = []
    groups[market].push(s)
  })

  return groups
}

export function ManualTrader({
  theme,
  activeSymbols,
  loadingMarkets,
  config,
  onConfigChange,
  currentTick,
  currentDigit,
}: ManualTraderProps) {
  const { token, isLoggedIn, balance: authBalance, accountType } = useDerivAuth()

  const apiClientRef = useRef<DerivAPIClient | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([])
  const [journalLog, setJournalLog] = useState<LogEntry[]>([])
  const [activeSubTab, setActiveSubTab] = useState("stats")
  const [stats, setStats] = useState<BotStats>({
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
        console.log("[v0] ManualTrader API connected")
      } catch (error) {
        console.error("[v0] ManualTrader API error:", error)
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

  const currentContract = useMemo(() => {
    const tradeType = config.tradeType as keyof typeof TRADE_TYPES
    return TRADE_TYPES[tradeType]?.contracts.find((c) => c.value === config.contractType)
  }, [config.tradeType, config.contractType])

  const requiresBarrier = currentContract?.requiresBarrier || false
  const barrierType = currentContract?.barrierType
  const isRangeContract = barrierType === "range"

  // Update contract type when trade type changes
  useEffect(() => {
    const tradeType = config.tradeType as keyof typeof TRADE_TYPES
    const contracts = TRADE_TYPES[tradeType]?.contracts
    if (contracts && contracts.length > 0 && !contracts.find((c) => c.value === config.contractType)) {
      onConfigChange({ contractType: contracts[0].value, barrier: "5", barrier2: "" })
    }
  }, [config.tradeType])

  const groupedSymbols = useMemo(() => groupSymbolsByMarket(activeSymbols), [activeSymbols])

  // Execute a single trade
  const executeTrade = useCallback(async () => {
    if (!apiClientRef.current || !isLoggedIn) {
      logJournal("Please log in first", "error")
      return
    }

    try {
      setIsExecuting(true)
      logJournal(`Executing ${config.contractType} on ${config.symbol}`, "info")

      // Build proposal request
      const proposalRequest: any = {
        proposal: 1,
        symbol: config.symbol,
        contract_type: config.contractType,
        amount: config.stake,
        basis: "stake",
        duration: config.duration,
        duration_unit: config.durationUnit,
        currency: "USD",
      }

      // Add barrier if required
      if (requiresBarrier) {
        if (barrierType === "digit") {
          proposalRequest.barrier = config.barrier
        } else if (barrierType === "price") {
          proposalRequest.barrier = `+${config.barrier}`
        } else if (isRangeContract) {
          proposalRequest.barrier = config.barrier
          proposalRequest.barrier2 = config.barrier2
        }
      }

      console.log("[v0] Proposal request:", proposalRequest)

      // Get proposal
      const proposalResponse = await apiClientRef.current.send(proposalRequest)

      if (proposalResponse.error) {
        throw new Error(proposalResponse.error.message)
      }

      const proposal = proposalResponse.proposal
      logJournal(`Proposal received: $${proposal.ask_price.toFixed(2)} -> $${proposal.payout.toFixed(2)}`, "info")

      // Buy contract
      const buyResponse = await apiClientRef.current.send({
        buy: proposal.id,
        price: proposal.ask_price,
      })

      if (buyResponse.error) {
        throw new Error(buyResponse.error.message)
      }

      const contractId = buyResponse.buy.contract_id
      const buyPrice = buyResponse.buy.buy_price

      logJournal(`Contract purchased: #${contractId}`, "info")

      // Wait for settlement
      const result = await new Promise<any>((resolve) => {
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
                  contractId,
                  buyPrice,
                  payout: contract.payout || 0,
                  profit: contract.profit || 0,
                  isWin: (contract.profit || 0) > 0,
                  entrySpot: contract.entry_spot,
                  exitSpot: contract.exit_spot,
                })
              }
            }
          } catch (err) {
            // Continue checking
          }
        }, 500)

        // Timeout after 30 seconds
        setTimeout(() => {
          clearInterval(checkInterval)
          resolve({ contractId, buyPrice, payout: 0, profit: -buyPrice, isWin: false })
        }, 30000)
      })

      // Update stats
      setStats((prev) => {
        const newStats = { ...prev }
        newStats.numberOfRuns++
        newStats.totalStake += config.stake

        if (result.isWin) {
          newStats.totalWins++
          newStats.contractsWon++
          newStats.totalPayout += result.payout
        } else {
          newStats.totalLosses++
          newStats.contractsLost++
        }

        newStats.totalProfit += result.profit
        newStats.winRate = newStats.numberOfRuns > 0 ? (newStats.totalWins / newStats.numberOfRuns) * 100 : 0

        // Check TP/SL
        if (newStats.totalProfit >= config.takeProfit) {
          setTPSLModal({ isOpen: true, type: "tp", amount: newStats.totalProfit })
        } else if (newStats.totalProfit <= -config.stopLoss) {
          setTPSLModal({ isOpen: true, type: "sl", amount: Math.abs(newStats.totalProfit) })
        }

        return newStats
      })

      // Add to history
      setTradeHistory((prev) => [
        {
          id: result.contractId.toString(),
          contractType: config.contractType,
          market: config.symbol,
          entry: new Date().toLocaleTimeString(),
          stake: config.stake,
          pl: result.profit,
          payout: result.payout,
          timestamp: Date.now(),
          entrySpot: result.entrySpot?.toString(),
          exitSpot: result.exitSpot?.toString(),
        },
        ...prev,
      ])

      logJournal(
        `Contract #${result.contractId} ${result.isWin ? "WON" : "LOST"}: ${result.profit >= 0 ? "+" : ""}$${result.profit.toFixed(2)}`,
        result.isWin ? "success" : "error",
      )
    } catch (error: any) {
      console.error("[v0] Trade error:", error)
      logJournal(`Trade failed: ${error.message}`, "error")
    } finally {
      setIsExecuting(false)
    }
  }, [isLoggedIn, config, requiresBarrier, barrierType, isRangeContract, logJournal])

  const resetStats = useCallback(() => {
    setStats({
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
    setTradeHistory([])
    setJournalLog([])
    logJournal("Stats reset", "info")
  }, [logJournal])

  return (
    <div className="space-y-4">
      <TPSLModal
        isOpen={tpslModal.isOpen}
        type={tpslModal.type}
        amount={tpslModal.amount}
        currency="USD"
        onClose={() => setTPSLModal({ ...tpslModal, isOpen: false })}
      />

      {/* Configuration Panel */}
      <div
        className={`p-4 rounded-lg border ${theme === "dark" ? "bg-[#0a0e27]/50 border-blue-500/20" : "bg-gray-50 border-gray-200"}`}
      >
        <h3 className={`text-sm font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          Trade Configuration
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
              disabled={loadingMarkets}
            >
              <SelectTrigger
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              >
                <SelectValue placeholder={loadingMarkets ? "Loading markets..." : "Select market"} />
              </SelectTrigger>
              <SelectContent
                className={`max-h-80 ${theme === "dark" ? "bg-[#0a0e27] border-blue-500/30" : "bg-white"}`}
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
            <Select value={config.tradeType} onValueChange={(val) => onConfigChange({ tradeType: val })}>
              <SelectTrigger
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-blue-500/30" : "bg-white"}>
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
            <Select value={config.contractType} onValueChange={(val) => onConfigChange({ contractType: val })}>
              <SelectTrigger
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-blue-500/30" : "bg-white"}>
                {TRADE_TYPES[config.tradeType as keyof typeof TRADE_TYPES]?.contracts.map((contract) => (
                  <SelectItem key={contract.value} value={contract.value} className="text-xs">
                    {contract.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Barrier/Prediction */}
            {requiresBarrier && !isRangeContract && (
              <div>
                <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  {barrierType === "digit" ? "Prediction (0-9)" : "Barrier"}
                </Label>
                {barrierType === "digit" ? (
                  <Select value={config.barrier} onValueChange={(val) => onConfigChange({ barrier: val })}>
                    <SelectTrigger
                      className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-blue-500/30" : "bg-white"}>
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
                    className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  />
                )}
              </div>
            )}

            {/* Stake */}
            <div>
              <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Stake ($)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0.35"
                value={config.stake}
                onChange={(e) => onConfigChange({ stake: Number.parseFloat(e.target.value) || 0.35 })}
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              />
            </div>

            {/* Duration */}
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
                  className={`text-xs h-9 flex-1 ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                />
                <Select value={config.durationUnit} onValueChange={(val: any) => onConfigChange({ durationUnit: val })}>
                  <SelectTrigger
                    className={`text-xs h-9 w-16 ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-blue-500/30" : "bg-white"}>
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

            {/* Martingale */}
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
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              />
            </div>

            {/* Stop Loss */}
            <div>
              <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Stop Loss ($)
              </Label>
              <Input
                type="number"
                min="1"
                value={config.stopLoss}
                onChange={(e) => onConfigChange({ stopLoss: Number.parseInt(e.target.value) || 50 })}
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              />
            </div>

            {/* Take Profit */}
            <div>
              <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Take Profit ($)
              </Label>
              <Input
                type="number"
                min="1"
                value={config.takeProfit}
                onChange={(e) => onConfigChange({ takeProfit: Number.parseInt(e.target.value) || 100 })}
                className={`text-xs h-9 ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Execute Button */}
      <Button
        onClick={executeTrade}
        disabled={!isLoggedIn || isExecuting}
        className="w-full h-12 text-sm font-bold bg-blue-500 hover:bg-blue-600"
      >
        {isExecuting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Executing Trade...
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            Execute Trade
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
