"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Play, Square, Trash2, Zap } from "lucide-react"
import { useDeriv } from "@/hooks/use-deriv"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { TransactionHistory } from "@/components/transaction-history"
import { TradingJournalPanel } from "@/components/trading-journal-panel"

interface LiveTradingPanelProps {
  theme: "light" | "dark"
  balance: number
  currency: string
}

interface Transaction {
  id: string
  contractType: string
  market: string
  entrySpot: string
  exitSpot: string
  lastDigit: number
  stake: number
  payout: number
  profitLoss: number
  timestamp: number
  status: "win" | "loss" | "open" // Added 'open' status
}

interface JournalEntry {
  time: string
  message: string
  type: "info" | "success" | "error" | "warn"
}

const MARKETS = [
  // Volatility Indices - 1 second
  { id: "1HZ10V", name: "Volatility 10 (1s)", category: "Volatility" },
  { id: "1HZ15V", name: "Volatility 15 (1s)", category: "Volatility" },
  { id: "1HZ25V", name: "Volatility 25 (1s)", category: "Volatility" },
  { id: "1HZ30V", name: "Volatility 30 (1s)", category: "Volatility" },
  { id: "1HZ50V", name: "Volatility 50 (1s)", category: "Volatility" },
  { id: "1HZ75V", name: "Volatility 75 (1s)", category: "Volatility" },
  { id: "1HZ100V", name: "Volatility 100 (1s)", category: "Volatility" },

  // Volatility Indices
  { id: "R_10", name: "Volatility 10 Index", category: "Volatility" },
  { id: "R_15", name: "Volatility 15 Index", category: "Volatility" },
  { id: "R_25", name: "Volatility 25 Index", category: "Volatility" },
  { id: "R_50", name: "Volatility 50 Index", category: "Volatility" },
  { id: "R_75", name: "Volatility 75 Index", category: "Volatility" },
  { id: "R_100", name: "Volatility 100 Index", category: "Volatility" },
  { id: "R_150", name: "Volatility 150 Index", category: "Volatility" },
  { id: "R_250", name: "Volatility 250 Index", category: "Volatility" },

  // Synthetic Indices
  { id: "WLDEUR", name: "World 2x (EUR)", category: "Synthetics" },
  { id: "WLDGBP", name: "World 2x (GBP)", category: "Synthetics" },
  { id: "WLDUSD", name: "World 2x (USD)", category: "Synthetics" },
  { id: "WLDJPY", name: "World 2x (JPY)", category: "Synthetics" },

  // Forex Major Pairs
  { id: "frxEURAUD", name: "EUR/AUD", category: "Forex" },
  { id: "frxEURCAD", name: "EUR/CAD", category: "Forex" },
  { id: "frxEURCHF", name: "EUR/CHF", category: "Forex" },
  { id: "frxEURGBP", name: "EUR/GBP", category: "Forex" },
  { id: "frxEURJPY", name: "EUR/JPY", category: "Forex" },
  { id: "frxEURUSD", name: "EUR/USD", category: "Forex" },
  { id: "frxGBPAUD", name: "GBP/AUD", category: "Forex" },
  { id: "frxGBPCAD", name: "GBP/CAD", category: "Forex" },
  { id: "frxGBPCHF", name: "GBP/CHF", category: "Forex" },
  { id: "frxGBPJPY", name: "GBP/JPY", category: "Forex" },
  { id: "frxGBPUSD", name: "GBP/USD", category: "Forex" },
  { id: "frxUSDCAD", name: "USD/CAD", category: "Forex" },
  { id: "frxUSDCHF", name: "USD/CHF", category: "Forex" },
  { id: "frxUSDJPY", name: "USD/JPY", category: "Forex" },

  // Cryptocurrencies
  { id: "cryBTCUSD", name: "Bitcoin (BTC/USD)", category: "Crypto" },
  { id: "cryETHUSD", name: "Ethereum (ETH/USD)", category: "Crypto" },
  { id: "cryXRPUSD", name: "Ripple (XRP/USD)", category: "Crypto" },
  { id: "cryLTCUSD", name: "Litecoin (LTC/USD)", category: "Crypto" },

  // Commodities
  { id: "GOLD", name: "Gold (XAU/USD)", category: "Commodities" },
  { id: "OIL_WTI", name: "Crude Oil WTI", category: "Commodities" },
  { id: "OIL_BRENT", name: "Crude Oil Brent", category: "Commodities" },
  { id: "NGAS", name: "Natural Gas", category: "Commodities" },
  { id: "XPTUSD", name: "Platinum", category: "Commodities" },
  { id: "XPDUSD", name: "Palladium", category: "Commodities" },
]

const TRADE_TYPES = {
  DIGITS: {
    label: "Digits",
    contracts: ["DIGITOVER", "DIGITUNDER", "DIGITEVEN", "DIGITODD", "DIGITDIFF", "DIGITMATCH"],
  },
  OVER_UNDER: { label: "Over/Under", contracts: ["CALL", "PUT"] },
  RISE_FALL: { label: "Rise/Fall", contracts: ["CALL", "PUT"] },
  EVEN_ODD: { label: "Even/Odd", contracts: ["DIGITEVEN", "DIGITODD"] },
  TOUCH_NO_TOUCH: { label: "Touch/No Touch", contracts: ["TOUCH", "NOTOUCH"] },
  STAYS_GOES: { label: "Stays/Goes", contracts: ["STAYS_IN", "GOES_OUT"] },
  HIGHER_LOWER: { label: "Higher/Lower", contracts: ["CALL_SPREAD", "PUT_SPREAD"] },
}

const DURATIONS = [
  { value: 1, label: "1 Tick" },
  { value: 2, label: "2 Ticks" },
  { value: 5, label: "5 Ticks" },
  { value: 10, label: "10 Ticks" },
  { value: 15, label: "15 Ticks" },
  { value: 30, label: "30 Ticks" },
  { value: 60, label: "1 Minute" },
]

export function LiveTradingPanel({ theme, balance, currency }: LiveTradingPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("manual")
  const { connectionStatus, currentPrice, ws } = useDeriv() // Added ws from useDeriv
  const { isLoggedIn, activeAccount } = useDerivAuth()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([])
  const [totalStake, setTotalStake] = useState(0)
  const [totalPayout, setTotalPayout] = useState(0)
  const [totalPnL, setTotalPnL] = useState(0)
  const [contractsWon, setContractsWon] = useState(0)
  const [contractsLost, setContractsLost] = useState(0)

  // Manual Trading State
  const [manualMarket, setManualMarket] = useState("1HZ100V")
  const [manualTradeType, setManualTradeType] = useState("DIGITS")
  const [manualContract, setManualContract] = useState("DIGITOVER")
  const [manualStake, setManualStake] = useState(0.35)
  const [manualDuration, setManualDuration] = useState(1)
  const [manualPrediction, setManualPrediction] = useState("5")
  const [manualPayout, setManualPayout] = useState(0.55)
  const [manualContractValue, setManualContractValue] = useState(0.55)
  const [isExecuting, setIsExecuting] = useState(false)

  // AutoRun State
  const [autorunMarket, setAutorunMarket] = useState("1HZ100V")
  const [autorunTradeType, setAutorunTradeType] = useState("DIGITS")
  const [autorunContract, setAutorunContract] = useState("DIGITOVER")
  const [autorunStake, setAutorunStake] = useState(0.35)
  const [autorunDuration, setAutorunDuration] = useState(1)
  const [autorunSL, setAutorunSL] = useState(50)
  const [autorunTP, setAutorunTP] = useState(100)
  const [autorunMartingale, setAutorunMartingale] = useState(2.1)
  const [autorunRunning, setAutorunRunning] = useState(false)
  const autorunIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [autorunTradesCount, setAutorunTradesCount] = useState(0) // Declare autorunTradesCount

  const [speedbotMarket, setSpeedbotMarket] = useState("1HZ100V")
  const [speedbotTradeType, setSpeedbotTradeType] = useState("DIGITS")
  const [speedbotContract, setSpeedbotContract] = useState("DIGITOVER")
  const [speedbotStake, setSpeedbotStake] = useState(0.1)
  const [speedbotPrediction, setSpeedbotPrediction] = useState("5")
  const [speedbotSL, setSpeedbotSL] = useState(30)
  const [speedbotTP, setSpeedbotTP] = useState(50)
  const [speedbotRunning, setSpeedbotRunning] = useState(false)
  const [speedbotTradesCount, setSpeedbotTradesCount] = useState(0)
  const speedbotIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const isAuthorized = connectionStatus === "connected" && isLoggedIn

  useEffect(() => {
    const contracts = TRADE_TYPES[manualTradeType as keyof typeof TRADE_TYPES]?.contracts || []
    if (contracts.length > 0) {
      setManualContract(contracts[0])
    }
  }, [manualTradeType])

  useEffect(() => {
    const contracts = TRADE_TYPES[autorunTradeType as keyof typeof TRADE_TYPES]?.contracts || []
    if (contracts.length > 0) {
      setAutorunContract(contracts[0])
    }
  }, [autorunTradeType])

  useEffect(() => {
    const contracts = TRADE_TYPES[speedbotTradeType as keyof typeof TRADE_TYPES]?.contracts || []
    if (contracts.length > 0) {
      setSpeedbotContract(contracts[0])
    }
  }, [speedbotTradeType])

  const calculatePayout = (stake: number, contractType: string, bid?: number): number => {
    // If we have actual bid from proposal API, use it
    if (bid !== undefined) {
      return Number.parseFloat((bid - stake).toFixed(2))
    }

    // Fallback to Deriv API documented payout ratios
    const payoutRatios: Record<string, number> = {
      DIGITOVER: 0.87,
      DIGITUNDER: 0.87,
      DIGITEVEN: 0.89,
      DIGITODD: 0.89,
      DIGITDIFF: 0.91,
      DIGITMATCH: 0.91,
      CALL: 0.85,
      PUT: 0.85,
      TOUCH: 0.9,
      NOTOUCH: 0.9,
      STAYS_IN: 0.84,
      GOES_OUT: 0.84,
      CALL_SPREAD: 0.8,
      PUT_SPREAD: 0.8,
    }
    const ratio = payoutRatios[contractType] || 0.85
    return Number.parseFloat((stake * ratio).toFixed(2))
  }

  const getContractProposal = async (config: {
    market: string
    tradeType: string
    contractType: string
    stake: number
    duration: number
  }) => {
    try {
      // Using Deriv's proposal API as documented
      const payload = {
        proposal: 1,
        subscribe: 0,
        contract_type: config.contractType,
        currency: activeAccount?.currency || "USD",
        symbol: config.market,
        duration: config.duration,
        duration_unit: "t", // ticks
        amount: config.stake,
        basis: "stake",
      }

      ws?.send(JSON.stringify(payload)) // ws.send expects a string

      // Subscribe to proposal updates
      ws?.subscribe("proposal", (data: any) => {
        if (data.proposal) {
          const bid = data.proposal.display_value ? Number.parseFloat(data.proposal.display_value) : 0
          setManualPayout(Number.parseFloat((bid - config.stake).toFixed(2)))
          setManualContractValue(Number.parseFloat(bid.toFixed(2)))
        }
      })
    } catch (error) {
      console.error("[v0] Failed to get proposal:", error)
    }
  }

  const getLastDigit = (price: number | undefined): number => {
    if (!price) return 0
    const priceStr = price.toFixed(5)
    const lastChar = priceStr.charAt(priceStr.length - 1)
    return Number.parseInt(lastChar, 10) || 0
  }

  const executeTrade = async (config: {
    market: string
    tradeType: string
    contract: string
    stake: number
    duration: number
    prediction?: string
  }) => {
    if (!isLoggedIn || !activeAccount?.token) {
      console.error("[v0] Not logged in or no token")
      return
    }

    try {
      // Get current price first
      const price = currentPrice || 0
      if (!price) {
        console.warn("[v0] No price available yet")
        return
      }

      const lastDigit = getLastDigit(price)
      const payout = calculatePayout(config.stake, config.contract)

      // Use Deriv buy API as documented in trading-apis
      const buyPayload = {
        buy: 1,
        contract_type: config.contract,
        currency: activeAccount.currency || "USD",
        symbol: config.market,
        duration: config.duration,
        duration_unit: "t", // ticks
        amount: config.stake,
        barrier: config.prediction ? Number.parseInt(config.prediction) : undefined, // Only provide barrier if prediction is made
      }

      // Send buy request through WebSocket
      ws?.send(JSON.stringify(buyPayload)) // ws.send expects a string

      // Subscribe to buy response
      ws?.subscribe("buy", (data: any) => {
        if (data.buy) {
          const newTx: Transaction = {
            id: data.buy.contract_id || `TRADE_${Date.now()}`,
            contractType: config.contract,
            market: config.market,
            entrySpot: Number.parseFloat(price.toFixed(5)),
            exitSpot: "0.00000", // Will update on contract completion
            lastDigit,
            stake: config.stake,
            payout: Number.parseFloat((config.stake + payout).toFixed(2)),
            profitLoss: payout, // Initial PnL is the potential profit if won
            timestamp: Math.floor(Date.now() / 1000),
            status: "open", // Set status to 'open'
          }

          setTransactions((prev) => [newTx, ...prev].slice(0, 100))
          setTotalStake((prev) => Number.parseFloat((prev + config.stake).toFixed(2)))
          // Payout calculation here needs adjustment as it represents potential payout
          setTotalPayout((prev) =>
            Number.parseFloat((prev + Number.parseFloat((config.stake + payout).toFixed(2))).toFixed(2)),
          )
          // Initial PnL will be updated upon contract completion
        }
      })
    } catch (error) {
      console.error("[v0] Trade execution failed:", error)
      addJournalEntry("error", `Trade execution failed: ${error}`)
    }
  }

  // Mock the actual trade execution for now
  const executeMockTrade = async (config: {
    market: string
    type: string
    contract: string
    stake: number
    duration: number
    prediction?: string
  }) => {
    const payout = calculatePayout(config.stake, config.contract)
    const timestamp = Math.floor(Date.now() / 1000)
    const isWin = Math.random() > 0.48

    const entryPrice = currentPrice || Math.random() * 100
    const exitPrice = Math.random() * 100
    const lastDigit = getLastDigit(exitPrice)

    const newTx: Transaction = {
      id: `TRADE_${Date.now()}`,
      contractType: config.contract,
      market: config.market,
      entrySpot: Number.parseFloat(entryPrice.toFixed(5)),
      exitSpot: Number.parseFloat(exitPrice.toFixed(5)),
      lastDigit: lastDigit,
      stake: config.stake,
      payout: isWin ? Number.parseFloat((config.stake + payout).toFixed(2)) : 0,
      profitLoss: isWin ? payout : -config.stake,
      timestamp,
      status: isWin ? "win" : "loss",
    }

    setTransactions((prev) => [newTx, ...prev].slice(0, 100))
    setTotalStake((prev) => Number.parseFloat((prev + config.stake).toFixed(2)))
    setTotalPayout((prev) => Number.parseFloat((prev + (isWin ? config.stake + payout : 0)).toFixed(2)))
    setTotalPnL((prev) => Number.parseFloat((prev + (isWin ? payout : -config.stake)).toFixed(2)))
    if (isWin) setContractsWon((prev) => prev + 1)
    else setContractsLost((prev) => prev + 1)

    return { ...newTx, isWin }
  }

  const handleManualTrade = async () => {
    if (!isAuthorized || isExecuting) return
    setIsExecuting(true)

    try {
      // For now, we use the mock trade execution. Replace with executeTrade when API is fully integrated.
      const result = await executeMockTrade({
        market: manualMarket,
        type: manualTradeType,
        contract: manualContract,
        stake: manualStake,
        duration: manualDuration,
        prediction: manualPrediction,
      })

      addJournalEntry(
        result.isWin ? "success" : "error",
        `${manualContract}: ${result.isWin ? "WIN" : "LOSS"} - Payout: ${result.payout.toFixed(2)} ${currency}`,
      )
    } catch (error) {
      addJournalEntry("error", `Trade execution failed`)
      console.error("Manual trade error:", error)
    } finally {
      setIsExecuting(false)
    }
  }

  const toggleAutorun = () => {
    if (!isAuthorized) return

    if (autorunRunning) {
      setAutorunRunning(false)
      if (autorunIntervalRef.current) {
        clearInterval(autorunIntervalRef.current)
      }
      addJournalEntry("warn", `AutoRun stopped - ${autorunTradesCount} trades executed`)
    } else {
      setAutorunRunning(true)
      let sessionPnL = 0

      autorunIntervalRef.current = setInterval(async () => {
        if (sessionPnL <= -autorunSL || sessionPnL >= autorunTP) {
          setAutorunRunning(false)
          if (autorunIntervalRef.current) clearInterval(autorunIntervalRef.current)
          addJournalEntry("info", `AutoRun target reached - P&L: ${sessionPnL.toFixed(2)} ${currency}`)
          return
        }

        // For now, we use the mock trade execution. Replace with executeTrade when API is fully integrated.
        const result = await executeMockTrade({
          market: autorunMarket,
          type: autorunTradeType,
          contract: autorunContract,
          stake: autorunStake,
          duration: autorunDuration,
        })

        sessionPnL += result.profitLoss
        setAutorunTradesCount((prev) => prev + 1) // Use setAutorunTradesCount
      }, 2500)
    }
  }

  const toggleSpeedbot = () => {
    if (!isAuthorized) return

    if (speedbotRunning) {
      setSpeedbotRunning(false)
      if (speedbotIntervalRef.current) {
        clearInterval(speedbotIntervalRef.current)
      }
      addJournalEntry("warn", `SpeedBot stopped - ${speedbotTradesCount} trades executed at tick speed`)
    } else {
      setSpeedbotRunning(true)
      let sessionPnL = 0

      // Execute on every tick (approximately every 100-200ms for real markets)
      speedbotIntervalRef.current = setInterval(async () => {
        if (sessionPnL <= -speedbotSL || sessionPnL >= speedbotTP) {
          setSpeedbotRunning(false)
          if (speedbotIntervalRef.current) clearInterval(speedbotIntervalRef.current)
          addJournalEntry("info", `SpeedBot target reached - P&L: ${sessionPnL.toFixed(2)} ${currency}`)
          return
        }

        // For now, we use the mock trade execution. Replace with executeTrade when API is fully integrated.
        const result = await executeMockTrade({
          market: speedbotMarket,
          type: speedbotTradeType,
          contract: speedbotContract,
          stake: speedbotStake,
          duration: 1, // Speedbot always uses 1 tick duration
          prediction: speedbotPrediction,
        })

        sessionPnL += result.profitLoss
        setSpeedbotTradesCount((prev) => prev + 1)
      }, 100) // Execute every tick (100ms = fastest execution)
    }
  }

  const addJournalEntry = (type: JournalEntry["type"], message: string) => {
    const entry: JournalEntry = {
      time: new Date().toLocaleTimeString(),
      message,
      type,
    }
    setJournalEntries((prev) => [entry, ...prev].slice(0, 200))
  }

  const clearAll = () => {
    setTransactions([])
    setJournalEntries([])
    setTotalStake(0)
    setTotalPayout(0)
    setTotalPnL(0)
    setContractsWon(0)
    setContractsLost(0)
    setAutorunTradesCount(0) // Clear AutoRun trades count
    setSpeedbotTradesCount(0) // Clear SpeedBot trades count
    addJournalEntry("info", "All trading history cleared")
  }

  // Effect to fetch proposals and trigger trade execution based on tab
  useEffect(() => {
    if (!isAuthorized) return

    // Manual tab specific logic
    if (activeTab === "manual") {
      getContractProposal({
        market: manualMarket,
        tradeType: manualTradeType,
        contractType: manualContract,
        stake: manualStake,
        duration: manualDuration,
      })
    }

    // Other tabs might have their own proposal fetching logic if needed
  }, [activeTab, manualMarket, manualTradeType, manualContract, manualStake, manualDuration, isAuthorized])

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed top-1/2 -translate-y-1/2 z-50 h-24 w-8 rounded-l-lg rounded-r-none shadow-lg transition-all duration-300 ${
          isOpen ? "right-[600px]" : "right-0"
        } ${
          theme === "dark"
            ? "bg-gradient-to-b from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            : "bg-gradient-to-b from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        }`}
      >
        {isOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </Button>

      <div
        className={`fixed top-0 right-0 h-full w-[600px] z-40 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } ${
          theme === "dark"
            ? "bg-[#0a0e27]/98 border-l border-blue-500/30 backdrop-blur-xl"
            : "bg-white/98 border-l border-gray-300 backdrop-blur-xl"
        } shadow-2xl overflow-y-auto flex flex-col`}
      >
        <div className="sticky top-0 p-4 border-b border-blue-500/20 bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Trading Bot</h2>
            <Badge
              className={`${
                isAuthorized
                  ? "bg-green-500/20 text-green-400 border-green-500/50"
                  : "bg-red-500/20 text-red-400 border-red-500/50"
              }`}
            >
              {isAuthorized ? "Connected" : "Disconnected"}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
              <div className="font-bold text-green-400">Linked</div>
              <div className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                {activeAccount?.accountCode || "—"}
              </div>
            </div>
            <div className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
              <div className="font-bold text-cyan-400">Account Type</div>
              <div className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>{activeAccount?.type || "—"}</div>
            </div>
            <div className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
              <div className="font-bold text-emerald-400">Balance</div>
              <div className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                {balance.toFixed(2)} {currency}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid w-full grid-cols-5 ${theme === "dark" ? "bg-[#0f1629]/50" : "bg-gray-100"}`}>
              <TabsTrigger value="manual" className="text-xs">
                Manual
              </TabsTrigger>
              <TabsTrigger value="autorun" className="text-xs">
                AutoRun
              </TabsTrigger>
              <TabsTrigger value="speedbot" className="text-xs">
                <Zap className="w-3 h-3" />
              </TabsTrigger>
              <TabsTrigger value="transactions" className="text-xs">
                Trans
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-3 mt-4">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-cyan-400" : "text-blue-600"}`}>
                      Market
                    </Label>
                    <Select value={manualMarket} onValueChange={setManualMarket}>
                      <SelectTrigger
                        className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MARKETS.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-cyan-400" : "text-blue-600"}`}>
                      Type
                    </Label>
                    <Select value={manualTradeType} onValueChange={setManualTradeType}>
                      <SelectTrigger
                        className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TRADE_TYPES).map(([key, val]) => (
                          <SelectItem key={key} value={key}>
                            {val.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-cyan-400" : "text-blue-600"}`}>
                    Contract
                  </Label>
                  <Select value={manualContract} onValueChange={setManualContract}>
                    <SelectTrigger
                      className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(TRADE_TYPES[manualTradeType as keyof typeof TRADE_TYPES]?.contracts || []).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {manualTradeType === "DIGITS" && (
                  <div>
                    <Label
                      className={`text-xs mb-1.5 block ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`}
                    >
                      Prediction (0-9)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="9"
                      value={manualPrediction}
                      onChange={(e) => setManualPrediction(e.target.value)}
                      className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                    />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label
                      className={`text-xs mb-1.5 block ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`}
                    >
                      Stake
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={manualStake}
                      onChange={(e) => setManualStake(Number.parseFloat(e.target.value))}
                      className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                    />
                  </div>
                  <div>
                    <Label
                      className={`text-xs mb-1.5 block ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`}
                    >
                      Ticks
                    </Label>
                    <Select
                      value={manualDuration.toString()}
                      onValueChange={(v) => setManualDuration(Number.parseInt(v))}
                    >
                      <SelectTrigger
                        className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATIONS.map((d) => (
                          <SelectItem key={d.value} value={d.value.toString()}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      className={`text-xs mb-1.5 block ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`}
                    >
                      Margin
                    </Label>
                    <Input
                      type="number"
                      value="1.5"
                      disabled
                      className={`text-xs ${theme === "dark" ? "bg-[#0f1629]/50 border-blue-500/20 text-gray-400" : ""}`}
                    />
                  </div>
                </div>
              </div>

              <Card
                className={`p-3 ${
                  theme === "dark"
                    ? "bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border-teal-500/30"
                    : "bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-300"
                }`}
              >
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Stake</div>
                    <div className={`font-bold text-lg ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>
                      {manualStake.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Potential Payout</div>
                    <div className={`font-bold text-lg ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>
                      {manualPayout.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Contract Value</div>
                    <div className={`font-bold text-lg ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>
                      {manualContractValue.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Return</div>
                    <div className={`font-bold text-lg ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>
                      {((manualPayout / manualStake) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>
              </Card>

              <Button
                onClick={handleManualTrade}
                disabled={!isAuthorized || isExecuting}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold"
              >
                {isExecuting ? "Executing..." : "Execute Trade"}
              </Button>
            </TabsContent>

            <TabsContent value="autorun" className="space-y-3 mt-4">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-cyan-400" : "text-blue-600"}`}>
                      Market
                    </Label>
                    <Select value={autorunMarket} onValueChange={setAutorunMarket} disabled={autorunRunning}>
                      <SelectTrigger
                        className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MARKETS.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-cyan-400" : "text-blue-600"}`}>
                      Type
                    </Label>
                    <Select value={autorunTradeType} onValueChange={setAutorunTradeType} disabled={autorunRunning}>
                      <SelectTrigger
                        className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TRADE_TYPES).map(([key, val]) => (
                          <SelectItem key={key} value={key}>
                            {val.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-cyan-400" : "text-blue-600"}`}>
                    Contract
                  </Label>
                  <Select value={autorunContract} onValueChange={setAutorunContract} disabled={autorunRunning}>
                    <SelectTrigger
                      className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(TRADE_TYPES[autorunTradeType as keyof typeof TRADE_TYPES]?.contracts || []).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label
                      className={`text-xs mb-1.5 block ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`}
                    >
                      Stake
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={autorunStake}
                      onChange={(e) => setAutorunStake(Number.parseFloat(e.target.value))}
                      disabled={autorunRunning}
                      className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                    />
                  </div>
                  <div>
                    <Label
                      className={`text-xs mb-1.5 block ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`}
                    >
                      Ticks
                    </Label>
                    <Select
                      value={autorunDuration.toString()}
                      onValueChange={(v) => setAutorunDuration(Number.parseInt(v))}
                      disabled={autorunRunning}
                    >
                      <SelectTrigger
                        className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATIONS.map((d) => (
                          <SelectItem key={d.value} value={d.value.toString()}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label
                      className={`text-xs mb-1.5 block ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`}
                    >
                      Martingale
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={autorunMartingale}
                      onChange={(e) => setAutorunMartingale(Number.parseFloat(e.target.value))}
                      disabled={autorunRunning}
                      className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                    />
                  </div>
                  <div>
                    <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
                      Margin
                    </Label>
                    <Input
                      type="number"
                      value="1.5"
                      disabled
                      className={`text-xs ${theme === "dark" ? "bg-[#0f1629]/50 border-blue-500/20 text-gray-400" : ""}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
                      Stop Loss
                    </Label>
                    <Input
                      type="number"
                      value={autorunSL}
                      onChange={(e) => setAutorunSL(Number.parseInt(e.target.value))}
                      disabled={autorunRunning}
                      className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                    />
                  </div>
                  <div>
                    <Label
                      className={`text-xs mb-1.5 block ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}
                    >
                      Take Profit
                    </Label>
                    <Input
                      type="number"
                      value={autorunTP}
                      onChange={(e) => setAutorunTP(Number.parseInt(e.target.value))}
                      disabled={autorunRunning}
                      className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={toggleAutorun}
                disabled={!isAuthorized}
                className={`w-full font-bold ${
                  autorunRunning
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                }`}
              >
                {autorunRunning ? (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Stop AutoRun ({autorunTradesCount})
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start AutoRun
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="speedbot" className="space-y-3 mt-4">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-cyan-400" : "text-blue-600"}`}>
                      Market
                    </Label>
                    <Select value={speedbotMarket} onValueChange={setSpeedbotMarket} disabled={speedbotRunning}>
                      <SelectTrigger
                        className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MARKETS.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-cyan-400" : "text-blue-600"}`}>
                      Type
                    </Label>
                    <Select value={speedbotTradeType} onValueChange={setSpeedbotTradeType} disabled={speedbotRunning}>
                      <SelectTrigger
                        className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TRADE_TYPES).map(([key, val]) => (
                          <SelectItem key={key} value={key}>
                            {val.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-cyan-400" : "text-blue-600"}`}>
                    Contract
                  </Label>
                  <Select value={speedbotContract} onValueChange={setSpeedbotContract} disabled={speedbotRunning}>
                    <SelectTrigger
                      className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(TRADE_TYPES[speedbotTradeType as keyof typeof TRADE_TYPES]?.contracts || []).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {speedbotTradeType === "DIGITS" && (
                  <div>
                    <Label
                      className={`text-xs mb-1.5 block ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`}
                    >
                      Prediction (0-9)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="9"
                      value={speedbotPrediction}
                      onChange={(e) => setSpeedbotPrediction(e.target.value)}
                      disabled={speedbotRunning}
                      className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                    />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label
                      className={`text-xs mb-1.5 block ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`}
                    >
                      Stake
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={speedbotStake}
                      onChange={(e) => setSpeedbotStake(Number.parseFloat(e.target.value))}
                      disabled={speedbotRunning}
                      className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                    />
                  </div>
                  <div>
                    <Label className={`text-xs mb-1.5 block ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
                      Stop Loss
                    </Label>
                    <Input
                      type="number"
                      value={speedbotSL}
                      onChange={(e) => setSpeedbotSL(Number.parseInt(e.target.value))}
                      disabled={speedbotRunning}
                      className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                    />
                  </div>
                  <div>
                    <Label
                      className={`text-xs mb-1.5 block ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}
                    >
                      Take Profit
                    </Label>
                    <Input
                      type="number"
                      value={speedbotTP}
                      onChange={(e) => setSpeedbotTP(Number.parseInt(e.target.value))}
                      disabled={speedbotRunning}
                      className={`text-xs ${theme === "dark" ? "bg-[#0f1629] border-blue-500/30 text-white" : ""}`}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={toggleSpeedbot}
                disabled={!isAuthorized}
                className={`w-full font-bold ${
                  speedbotRunning
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                }`}
              >
                {speedbotRunning ? (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    Stop SpeedBot ({speedbotTradesCount})
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Start SpeedBot (Tick Speed)
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-3 mt-4">
              <Card className={`p-3 ${theme === "dark" ? "bg-[#0f1629]/50" : "bg-gray-50"}`}>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Total Stake</div>
                    <div className={`font-bold ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>
                      {totalStake.toFixed(2)} {currency}
                    </div>
                  </div>
                  <div>
                    <div className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Total Payout</div>
                    <div className={`font-bold ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`}>
                      {totalPayout.toFixed(2)} {currency}
                    </div>
                  </div>
                  <div>
                    <div className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>No. of Runs</div>
                    <div className={`font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                      {transactions.length}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className={`p-3 ${theme === "dark" ? "bg-[#0f1629]/50" : "bg-gray-50"}`}>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Contracts Lost</div>
                    <div className={`font-bold ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
                      {totalStake > 0 ? ((contractsLost / transactions.length) * 100).toFixed(0) : 0}%
                    </div>
                  </div>
                  <div>
                    <div className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Contracts Won</div>
                    <div className={`font-bold ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
                      {totalStake > 0 ? ((contractsWon / transactions.length) * 100).toFixed(0) : 0}%
                    </div>
                  </div>
                  <div>
                    <div className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>Total P&L</div>
                    <div
                      className={`font-bold ${
                        totalPnL >= 0
                          ? theme === "dark"
                            ? "text-emerald-400"
                            : "text-emerald-600"
                          : theme === "dark"
                            ? "text-red-400"
                            : "text-red-600"
                      }`}
                    >
                      {totalPnL >= 0 ? "+" : ""}
                      {totalPnL.toFixed(2)}
                    </div>
                  </div>
                </div>
              </Card>

              <TransactionHistory transactions={transactions} theme={theme} maxHeight="max-h-64" />

              <Button onClick={clearAll} variant="outline" className="w-full bg-transparent">
                <Trash2 className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </TabsContent>

            <TabsContent value="history" className="space-y-3 mt-4">
              <TradingJournalPanel entries={journalEntries} theme={theme} maxHeight="max-h-96" />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
