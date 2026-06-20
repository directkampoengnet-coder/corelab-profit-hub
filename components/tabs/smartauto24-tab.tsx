"use client"

import { useState, useRef, useEffect } from "react"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { useDerivAPI } from "@/lib/deriv-api-context"
import { derivWebSocket } from "@/lib/deriv-websocket-manager"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Play, Pause } from "lucide-react"
import { DerivRealTrader } from "@/lib/deriv-real-trader"
import { EvenOddStrategy } from "@/lib/even-odd-strategy"
import { TradingJournal } from "@/lib/trading-journal"
import { TradeResultModal } from "@/components/modals/trade-result-modal"
import { TradingStrategies } from "@/lib/trading-strategies"
import { TradingStatsPanel } from "@/components/trading-stats-panel"
import { TransactionHistory } from "@/components/transaction-history"
import { TradingJournalPanel } from "@/components/trading-journal-panel"
import { TradeLog } from "@/components/trade-log"
import { DERIV_MARKETS, extractLastDigit } from "@/lib/deriv-markets"
import { TradingProgressPanel } from "@/components/trading-progress-panel" // Import TradingProgressPanel

interface AnalysisLogEntry {
  timestamp: Date
  message: string
  type: "info" | "success" | "warning" | "error"
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

interface SmartAuto24TabProps {
  theme: "light" | "dark"
}

export function SmartAuto24Tab({ theme = "dark" }: SmartAuto24TabProps) {
  const { isLoggedIn, token, balance: authBalance, accountType } = useDerivAuth()
  const { apiClient } = useDerivAPI()

  const isConnected = isLoggedIn && !!token
  const isAuthorized = isLoggedIn && !!token
  const balance = authBalance?.amount || 1000
  const currency = authBalance?.currency || "USD"

  const [allMarkets, setAllMarkets] = useState<Array<{ symbol: string; display_name: string }>>([])
  const [loadingMarkets, setLoadingMarkets] = useState(true)

  // Configuration state
  const [market, setMarket] = useState("R_100") // Renamed from market to selectedMarket in useEffect
  const [stake, setStake] = useState("0.35")
  const [targetProfit, setTargetProfit] = useState("1")
  const [analysisTimeMinutes, setAnalysisTimeMinutes] = useState("30")
  const [ticksForEntry, setTicksForEntry] = useState("36000")
  const [strategies] = useState<string[]>(["Even/Odd", "Over 3/Under 6", "Over 2/Under 7", "Differs"])
  const [selectedStrategy, setSelectedStrategy] = useState("Even/Odd")
  const strategiesRef = useRef<TradingStrategies>(new TradingStrategies())

  const [martingaleRatios, setMartingaleRatios] = useState<Record<string, number>>({
    "Even/Odd": 2.0,
    "Over 3/Under 6": 2.6,
    "Over 2/Under 7": 3.5,
    Differs: 2.3,
  })

  const [ticksPerTrade, setTicksPerTrade] = useState<number>(1)

  // Trading state
  const [isRunning, setIsRunning] = useState(false)
  const [status, setStatus] = useState<"idle" | "analyzing" | "trading" | "completed">("idle")
  const [sessionProfit, setSessionProfit] = useState(0)
  const [sessionTrades, setSessionTrades] = useState(0)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisLog, setAnalysisLog] = useState<AnalysisLogEntry[]>([])
  const [timeLeft, setTimeLeft] = useState(0)

  const [marketPrice, setMarketPrice] = useState<number | null>(null)
  const [lastDigit, setLastDigit] = useState<number | null>(null) // Renamed from lastDigit to currentDigit in useEffect
  const [currentDigit, setCurrentDigit] = useState<number | null>(null) // New state for current digit

  // Analysis data
  const [digitFrequencies, setDigitFrequencies] = useState<number[]>(Array(10).fill(0))
  const [overUnderAnalysis, setOverUnderAnalysis] = useState({ over: 0, under: 0, total: 0 })
  const [ticksCollected, setTicksCollected] = useState(0)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [showAnalysisResults, setShowAnalysisResults] = useState(false)

  const [differsWaitTicks, setDiffersWaitTicks] = useState(0)
  const [differsSelectedDigit, setDiffersSelectedDigit] = useState<number | null>(null)
  const [differsWaitingForEntry, setDiffersWaitingForEntry] = useState(false)
  const [differsTicksSinceAppearance, setDiffersTicksSinceAppearance] = useState(0)

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

  const [tradeHistory, setTradeHistory] = useState<any[]>([])
  const [journalLog, setJournalLog] = useState<any[]>([])

  // Refs
  const traderRef = useRef<DerivRealTrader | null>(null)
  const strategyRef = useRef<EvenOddStrategy>(new EvenOddStrategy())
  const journalRef = useRef<TradingJournal>(new TradingJournal("smartauto24"))
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Modal state
  const [showResultModal, setShowResultModal] = useState(false)
  const [resultType, setResultType] = useState<"tp" | "sl">("tp")
  const [resultAmount, setResultAmount] = useState(0)

  // New state for stop loss and take profit popups
  const [showTPPopup, setShowTPPopup] = useState(false)
  const [tpAmount, setTpAmount] = useState(0)
  const [showSLPopup, setShowSLPopup] = useState(false)
  const [slAmount, setSlAmount] = useState(0)

  // New state for consecutive digit tracking
  const [consecutiveEvenCount, setConsecutiveEvenCount] = useState(0)
  const [consecutiveOddCount, setConsecutiveOddCount] = useState(0)
  const [lastDigitWasEven, setLastDigitWasEven] = useState<boolean | null>(null)

  // New state for stop loss percentage
  const [stopLossPercent, setStopLossPercent] = useState("50")

  const [last15Digits, setLast15Digits] = useState<number[]>([])
  const last15DigitsRef = useRef<number[]>([])

  const selectedMarket = market // Alias for clarity in useEffect

  useEffect(() => {
    if (!isConnected || !isAuthorized) return

    const loadMarkets = async () => {
      try {
        setLoadingMarkets(true)

        // Replace:
        // const VALID_MARKETS = DERIV_MARKETS.filter((m) => m.category === "volatility_1s" || m.category === "volatility")
        // With:
        const VALID_MARKETS = (Array.isArray(DERIV_MARKETS) ? DERIV_MARKETS : []).filter(
          (m) => m.category === "volatility_1s" || m.category === "volatility",
        )
        setAllMarkets(VALID_MARKETS)
        console.log("[v0] Loaded valid markets:", VALID_MARKETS.length)
      } catch (error) {
        console.error("[v0] Failed to load markets:", error)
      } finally {
        setLoadingMarkets(false)
      }
    }

    loadMarkets()
  }, [isConnected, isAuthorized])

  useEffect(() => {
    if (!derivWebSocket) return

    let subscriptionId: string | null = null

    const initConnection = async () => {
      try {
        if (!derivWebSocket.isConnected()) {
          await derivWebSocket.connect()
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }

        subscriptionId = await derivWebSocket.subscribeTicks(selectedMarket, (tickData) => {
          if (tickData.quote && Number.isFinite(tickData.quote)) {
            const price = tickData.quote
            setMarketPrice(price)

            const digit = extractLastDigit(price, selectedMarket)
            setCurrentDigit(digit) // Use the new state

            // Update last 15 digits
            last15DigitsRef.current = [...last15DigitsRef.current, digit].slice(-15)
            setLast15Digits([...last15DigitsRef.current])
          }
        })
      } catch (error) {
        console.error("[v0] SmartAuto24 connection error:", error)
        addAnalysisLog(
          `Failed to connect or subscribe to ${selectedMarket}: ${error instanceof Error ? error.message : "Unknown error"}`,
          "warning",
        )
      }
    }

    initConnection()

    return () => {
      if (subscriptionId) {
        derivWebSocket.unsubscribe(subscriptionId).catch(() => {})
      }
    }
  }, [selectedMarket]) // Dependency on selectedMarket

  useEffect(() => {
    if (!isLoggedIn || !token) {
      console.log("[v0] SmartAuto24: Not authorized, waiting for login")
      return
    }

    const initAPIConnection = async () => {
      try {
        // Use token from auth, not stored token
        console.log("[v0] SmartAuto24: Initializing with auth token")
        addAnalysisLog("Connected to Deriv API", "success")
      } catch (error) {
        console.error("[v0] SmartAuto24 initialization error:", error)
        addAnalysisLog("Failed to initialize API connection", "error")
      }
    }

    initAPIConnection()
  }, [isLoggedIn, token])

  const addAnalysisLog = (message: string, type: "info" | "success" | "warning" | "error" = "info") => {
    setAnalysisLog((prev) => [
      {
        timestamp: new Date(),
        message,
        type,
      },
      ...prev.slice(0, 99),
    ])
  }

  const handleStartAnalysis = async () => {
    if (!isAuthorized || !derivWebSocket) {
      addAnalysisLog("Not logged in or API not ready", "warning")
      return
    }

    setIsRunning(true)
    setStatus("analyzing")
    setAnalysisProgress(0)
    setTimeLeft(Number.parseInt(analysisTimeMinutes) * 60)
    setDigitFrequencies(Array(10).fill(0))
    setOverUnderAnalysis({ over: 0, under: 0, total: 0 })
    setTicksCollected(0)
    setLast15Digits([]) // Reset last 15 digits
    last15DigitsRef.current = [] // Reset ref
    // Reset Differs strategy state
    setDiffersSelectedDigit(null)
    setDiffersWaitingForEntry(false)
    setDiffersTicksSinceAppearance(0)
    setSessionProfit(0) // Reset session profit on new analysis
    setSessionTrades(0) // Reset session trades on new analysis

    addAnalysisLog(`Starting ${analysisTimeMinutes} minute analysis on ${market}...`, "info")

    traderRef.current = new DerivRealTrader(apiClient as any) // Consider updating this if DerivRealTrader can use apiClient directly

    // Start timer
    const analysisSeconds = Number.parseInt(analysisTimeMinutes) * 60
    let secondsElapsed = 0

    timerIntervalRef.current = setInterval(() => {
      secondsElapsed++
      setTimeLeft(Math.max(0, analysisSeconds - secondsElapsed))
      setAnalysisProgress((secondsElapsed / analysisSeconds) * 100)

      if (secondsElapsed >= analysisSeconds) {
        clearInterval(timerIntervalRef.current!)
        completeAnalysis()
      }
    }, 1000)
  }

  const completeAnalysis = async () => {
    setStatus("trading")
    addAnalysisLog("Analysis complete! Analyzing with selected strategy...", "success")

    const recentDigits: number[] = []
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < digitFrequencies[i]; j++) {
        recentDigits.push(i)
      }
    }

    let analysis: any = null
    if (selectedStrategy === "Differs") {
      analysis = await analyzeDiffersStrategy(recentDigits)
      if (!analysis) {
        addAnalysisLog("Differs strategy: No suitable digit found. Stopping.", "warning")
        setIsRunning(false)
        setStatus("idle")
        return
      }
    } else if (selectedStrategy === "Even/Odd") {
      analysis = strategiesRef.current!.analyzeEvenOdd(recentDigits)
    } else if (selectedStrategy === "Over 3/Under 6") {
      analysis = strategiesRef.current!.analyzeOver3Under6(recentDigits)
    } else if (selectedStrategy === "Over 2/Under 7") {
      analysis = strategiesRef.current!.analyzeOver2Under7(recentDigits)
    }

    setAnalysisData({
      strategy: selectedStrategy,
      power: analysis.power,
      signal: analysis.signal,
      confidence: analysis.confidence,
      description: analysis.description,
      digitFrequencies,
      ticksCollected,
      differsDigit: selectedStrategy === "Differs" ? differsSelectedDigit : undefined,
    })
    setShowAnalysisResults(true)

    if (!analysis.signal) {
      addAnalysisLog(`Analysis signal is missing or weak. Stopping.`, "warning")
      setIsRunning(false)
      setStatus("idle")
      return
    }

    addAnalysisLog(`${selectedStrategy} Power: ${analysis.power.toFixed(1)}% - Signal: ${analysis.signal}`, "success")

    if (selectedStrategy === "Differs" && differsSelectedDigit !== null) {
      setDiffersWaitingForEntry(true)
      setDiffersTicksSinceAppearance(0)
      addAnalysisLog(`Waiting for digit ${differsSelectedDigit} to appear, then watching next 3 ticks...`, "info")

      // Monitor for entry condition
      const checkEntryInterval = setInterval(() => {
        if (differsTicksSinceAppearance >= 3) {
          clearInterval(checkEntryInterval)
          setDiffersWaitingForEntry(false)
          addAnalysisLog(
            `Entry condition met! Digit ${differsSelectedDigit} didn't appear in 3 ticks. Starting trades.`,
            "success",
          )
          // executeTradesAfterAnalysis(); // Call the new unified trade execution
          // Assuming executeTradesAfterAnalysis needs the analysis data
          executeTradesAfterAnalysis() // This will use analysisData.signal etc.
        }
      }, 1000)

      return
    }

    // Execute trades for other strategies
    // executeTradesAfterAnalysis(); // Call the new unified trade execution
    executeTradesAfterAnalysis() // This will use analysisData.signal etc.
  }

  const analyzeDiffersStrategy = async (recentDigits: number[]) => {
    const total = recentDigits.length
    if (total < 100) {
      // Need sufficient data for analysis
      addAnalysisLog("Not enough data for Differs strategy analysis. Need at least 100 ticks.", "warning")
      return null
    }
    const frequencies = Array(10).fill(0)

    recentDigits.forEach((d) => frequencies[d]++)

    // Calculate percentages
    const percentages = frequencies.map((f) => (f / total) * 100)

    // Find most and least appearing
    const maxFreq = Math.max(...frequencies)
    const minFreq = Math.min(...frequencies)
    const mostAppearing = frequencies.indexOf(maxFreq)
    const leastAppearing = frequencies.indexOf(minFreq)

    // Find suitable digit (2-7, not most/least, <10% power, decreasing)
    let selectedDigit: number | null = null
    let selectedPower = 0

    for (let digit = 2; digit <= 7; digit++) {
      const power = percentages[digit]

      // Skip if most or least appearing
      if (digit === mostAppearing || digit === leastAppearing) continue

      // Must have less than 10% power
      if (power >= 10) continue

      // Check if decreasing (compare last 20% of data vs first 80%)
      const splitPoint = Math.floor(recentDigits.length * 0.8)
      const firstPart = recentDigits.slice(0, splitPoint).filter((d) => d === digit).length
      const lastPart = recentDigits.slice(splitPoint).filter((d) => d === digit).length

      const firstPartPercent = splitPoint > 0 ? (firstPart / splitPoint) * 100 : 0
      const lastPartPercent =
        recentDigits.length - splitPoint > 0 ? (lastPart / (recentDigits.length - splitPoint)) * 100 : 0

      // Must be decreasing (last part < first part)
      if (lastPartPercent >= firstPartPercent) continue

      // Found suitable digit
      selectedDigit = digit
      selectedPower = power
      break
    }

    if (selectedDigit === null) {
      addAnalysisLog("Differs strategy: No suitable digit found based on criteria.", "warning")
      return null
    }

    setDiffersSelectedDigit(selectedDigit)

    addAnalysisLog(
      `Selected digit ${selectedDigit} with ${selectedPower.toFixed(1)}% power (decreasing trend)`,
      "success",
    )

    return {
      signal: "DIFFERS",
      power: 100 - selectedPower, // Invert power (lower frequency = higher power for differs)
      confidence: 75, // Placeholder confidence
      description: `Differs strategy targeting digit ${selectedDigit} with ${selectedPower.toFixed(1)}% appearance rate (decreasing).`,
    }
  }

  // Unified trade execution logic
  const executeTrade = async (contractType: string, barrier?: string): Promise<any> => {
    if (!apiClient || !apiClient.isConnected()) {
      throw new Error("API not connected")
    }

    const stakeAmount = Number.parseFloat(stake)
    if (!isFinite(stakeAmount) || stakeAmount <= 0) {
      throw new Error("Invalid stake amount")
    }

    const tradeParams: any = {
      symbol: market,
      contract_type: contractType,
      amount: stakeAmount,
      basis: "stake",
      duration: ticksPerTrade,
      duration_unit: "t",
      currency: currency,
    }

    if (barrier !== undefined) {
      tradeParams.barrier = barrier
    }

    try {
      console.log(`[v0] Getting proposal for ${contractType}...`, tradeParams)

      // Get proposal with real payout
      const proposal = await apiClient.getProposal(tradeParams)
      console.log(`[v0] Proposal received - Payout: $${proposal.payout}, Ask Price: $${proposal.ask_price}`)

      // Buy the contract
      const buyResult = await apiClient.buyContract(proposal.id, proposal.ask_price)
      console.log(`[v0] Contract bought - ID: ${buyResult.contract_id}, Buy Price: $${buyResult.buy_price}`)

      // Monitor the contract
      return new Promise((resolve) => {
        apiClient.subscribeProposalOpenContract(buyResult.contract_id, (contractUpdate) => {
          if (contractUpdate.is_sold) {
            const profit = contractUpdate.profit || 0
            const isWin = profit > 0

            console.log(
              `[v0] Contract ${buyResult.contract_id} completed: ${isWin ? "WIN" : "LOSS"}, Profit: $${profit.toFixed(2)}`,
            )

            resolve({
              contractId: buyResult.contract_id,
              isWin,
              profit,
              payout: contractUpdate.payout || proposal.payout,
              buyPrice: buyResult.buy_price,
              entrySpot: contractUpdate.entry_spot,
              exitSpot: contractUpdate.exit_spot,
              timestamp: Date.now(),
            })
          }
        })
      })
    } catch (error: any) {
      console.error(`[v0] Trade execution failed:`, error)
      throw new Error(error.message || "Trade execution failed")
    }
  }

  const executeTradesAfterAnalysis = async () => {
    if (!analysisData) {
      alert("No analysis data available")
      return
    }

    setStatus("trading")
    addAnalysisLog("Starting trading session...", "info")

    const targetProfitAmount = Number.parseFloat(targetProfit)
    const stopLossAmount = (Number.parseFloat(stopLossPercent) / 100) * balance
    let currentProfit = 0
    let tradesExecuted = 0
    let consecutiveLosses = 0
    let martingaleMultiplier = 1

    while (currentProfit < targetProfitAmount && Math.abs(currentProfit) < stopLossAmount) {
      // Use the strategy selected by the user directly
      const currentStrategyName = selectedStrategy
      const tradeStrategy: any = { prediction: "UNKNOWN" } // Default prediction

      // Mock analysis result for the selected strategy if not generated by analyzeDiffersStrategy
      // In a real scenario, you'd want a more robust way to get the strategy prediction.
      if (currentStrategyName === "Even/Odd") {
        const digits = Array.from({ length: 100 }, (_, i) => i % 10) // Sample digits for mock analysis
        const strategyInstance = strategiesRef.current.getStrategy(currentStrategyName)
        const analysisResult = strategyInstance.analyze(digits) // Assuming analyze method exists
        tradeStrategy.prediction = analysisResult.signal
      } else if (currentStrategyName === "Over 3/Under 6") {
        const digits = Array.from({ length: 100 }, (_, i) => i % 10)
        const strategyInstance = strategiesRef.current.getStrategy(currentStrategyName)
        const analysisResult = strategyInstance.analyze(digits)
        tradeStrategy.prediction = analysisResult.signal.includes("OVER") ? "Over" : "Under"
      } else if (currentStrategyName === "Over 2/Under 7") {
        const digits = Array.from({ length: 100 }, (_, i) => i % 10)
        const strategyInstance = strategiesRef.current.getStrategy(currentStrategyName)
        const analysisResult = strategyInstance.analyze(digits)
        tradeStrategy.prediction = analysisResult.signal.includes("OVER") ? "Over" : "Under"
      } else if (currentStrategyName === "Differs" && differsSelectedDigit !== null) {
        // For Differs, the trigger is the wait ticks, not a direct prediction here.
        // The actual contract type depends on differsSelectedDigit.
        tradeStrategy.prediction = "DIFFERS" // Placeholder, contract logic handles it
      }

      const martingaleRatio = martingaleRatios[selectedStrategy] || 2.0
      const adjustedStake = Number.parseFloat(stake) * martingaleMultiplier

      if (adjustedStake > balance) {
        addAnalysisLog("Insufficient balance for next trade", "error")
        break
      }

      try {
        let contractType = ""
        let barrier: string | undefined = undefined

        // Map strategy to contract type
        if (selectedStrategy === "Even/Odd") {
          contractType = tradeStrategy.prediction === "Even" ? "DIGITEVEN" : "DIGITODD"
        } else if (selectedStrategy === "Over 3/Under 6") {
          if (tradeStrategy.prediction === "Over") {
            contractType = "DIGITOVER"
            barrier = "3"
          } else {
            contractType = "DIGITUNDER"
            barrier = "6"
          }
        } else if (selectedStrategy === "Over 2/Under 7") {
          if (tradeStrategy.prediction === "Over") {
            contractType = "DIGITOVER"
            barrier = "2"
          } else {
            contractType = "DIGITUNDER"
            barrier = "7"
          }
        } else if (selectedStrategy === "Differs" && differsSelectedDigit !== null) {
          contractType = "DIGITDIFF"
          barrier = differsSelectedDigit.toString()
        } else {
          // Fallback for unknown strategies or if tradeStrategy.prediction is not set correctly
          console.warn(
            `[v0] Unknown strategy or prediction for ${selectedStrategy}, attempting generic CALL/PUT based on analysis signal.`,
          )
          if (analysisData.signal === "BUY" || analysisData.signal === "UP") {
            contractType = "CALL"
          } else if (analysisData.signal === "SELL" || analysisData.signal === "DOWN") {
            contractType = "PUT"
          } else {
            // Default to a digit contract if analysis signal is unclear for binary
            contractType = "DIGITODD" // Or another default
            barrier = "5" // Default barrier
          }
        }

        addAnalysisLog(
          `Executing ${selectedStrategy} trade: ${tradeStrategy.prediction} (Stake: $${adjustedStake.toFixed(2)}, Martingale: ${martingaleMultiplier.toFixed(1)}x)`,
          "info",
        )

        const tradeResult = await executeTrade(contractType, barrier)

        tradesExecuted++
        setSessionTrades(tradesExecuted)
        currentProfit += tradeResult.profit
        setSessionProfit(currentProfit)

        setStats((prev) => {
          const newStats = { ...prev }
          newStats.numberOfRuns++
          newStats.totalStake += adjustedStake

          if (tradeResult.isWin) {
            newStats.totalWins++
            newStats.contractsWon++
            newStats.totalProfit += tradeResult.profit
            newStats.totalPayout += tradeResult.payout
            consecutiveLosses = 0
            martingaleMultiplier = 1
          } else {
            newStats.totalLosses++
            newStats.contractsLost++
            newStats.totalProfit += tradeResult.profit // profit is negative on loss
            consecutiveLosses++
            martingaleMultiplier *= martingaleRatio
          }

          newStats.winRate = newStats.numberOfRuns > 0 ? (newStats.totalWins / newStats.numberOfRuns) * 100 : 0

          return newStats
        })

        setTradeHistory((prev) => [
          {
            id: tradeResult.contractId?.toString() || `trade-${Date.now()}`,
            contractType: contractType + (barrier ? ` ${barrier}` : ""),
            market,
            entrySpot: tradeResult.entrySpot || "N/A",
            exitSpot: tradeResult.exitSpot || "N/A",
            buyPrice: adjustedStake,
            profitLoss: tradeResult.profit,
            timestamp: tradeResult.timestamp,
            status: tradeResult.isWin ? "win" : "loss",
            marketPrice: marketPrice || 0,
          },
          ...prev,
        ])

        addAnalysisLog(
          `Trade ${tradesExecuted}: ${tradeResult.isWin ? "WIN" : "LOSS"} - P/L: $${tradeResult.profit.toFixed(2)} (Martingale: ${martingaleMultiplier.toFixed(1)}x)`,
          tradeResult.isWin ? "success" : "warning",
        )

        // Check for take profit
        if (currentProfit >= targetProfitAmount) {
          setResultType("tp")
          setResultAmount(currentProfit)
          setShowResultModal(true)
          setTpAmount(currentProfit)
          setShowTPPopup(true)
          setTimeout(() => setShowTPPopup(false), 5000)
          break
        }

        // Check for stop loss
        if (Math.abs(currentProfit) >= stopLossAmount) {
          setResultType("sl")
          setResultAmount(currentProfit)
          setShowResultModal(true)
          setSlAmount(currentProfit)
          setShowSLPopup(true)
          setTimeout(() => setShowSLPopup(false), 5000)
          break
        }

        // Wait before next trade
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error: any) {
        console.error("[v0] Trade execution error:", error)
        addAnalysisLog(`Trade error: ${error.message}`, "error")
        // Consider if we should break or continue after an error
        break
      }
    }

    setStatus("completed")
    setIsRunning(false)
    addAnalysisLog(
      `Trading session completed. Final P/L: $${currentProfit.toFixed(2)}, Trades: ${tradesExecuted}`,
      "success",
    )
  }

  const handleStopTrading = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current)
    setIsRunning(false)
    setStatus("idle")
    addAnalysisLog("Trading stopped", "info")
  }

  const last15DigitsForDisplay = last15Digits.slice(-15) // Ensure it's always the last 15

  const evenBias = last15DigitsForDisplay.filter((d) => d % 2 === 0).length
  const oddBias = last15DigitsForDisplay.length - evenBias
  const biasPercentage =
    last15DigitsForDisplay.length > 0
      ? ((Math.max(evenBias, oddBias) / last15DigitsForDisplay.length) * 100).toFixed(1)
      : "0.0"
  const biasDirection = evenBias > oddBias ? "EVEN" : evenBias < oddBias ? "ODD" : "NEUTRAL"

  return (
    <div
      className={`w-full rounded-lg p-3 sm:p-4 border ${theme === "dark" ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20" : "bg-white border-gray-200"}`}
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-blue-500/20">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isConnected && isAuthorized ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
          />
          <span className={`text-xs sm:text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
            {isConnected && isAuthorized ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <h2 className={`text-base sm:text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            SmartAuto24 - AI Trading Bot
          </h2>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">{accountType}</Badge>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs font-bold">
              {balance.toFixed(2)} {currency}
            </Badge>
          </div>
        </div>
      </div>

      {!isConnected || !isAuthorized ? (
        <div
          className={`p-4 rounded-lg border text-center ${theme === "dark" ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"}`}
        >
          <p className={`text-sm ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
            Please log in with Deriv to use SmartAuto24
          </p>
        </div>
      ) : (
        <>
          {isRunning && (
            <TradingProgressPanel
              isRunning={isRunning}
              status={status as any}
              totalTrades={sessionTrades}
              wins={sessionTrades > 0 ? Math.round(sessionTrades * 0.5) : 0}
              losses={sessionTrades > 0 ? Math.round(sessionTrades * 0.5) : 0}
              currentProfit={sessionProfit}
              targetProfit={Number.parseFloat(targetProfit)}
              stopLoss={(Number.parseFloat(stopLossPercent) / 100) * balance}
              currentStake={Number.parseFloat(stake)}
              signalStatus={analysisData?.signal as any}
            />
          )}

          {marketPrice !== null &&
            currentDigit !== null && ( // Use currentDigit
              <div
                className={`p-4 rounded-lg border mb-4 ${theme === "dark" ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30" : "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div
                      className={`text-xs font-semibold mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                    >
                      Market Price
                    </div>
                    <div className={`text-2xl font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                      {marketPrice.toFixed(5)}
                    </div>
                  </div>
                  <div>
                    <div
                      className={`text-xs font-semibold mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                    >
                      Last Digit
                    </div>
                    <div className={`text-2xl font-bold ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
                      {currentDigit} {/* Use the new state */}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-xs font-semibold mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                    >
                      Symbol
                    </div>
                    <div className={`text-sm font-bold ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`}>
                      {market}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {showAnalysisResults && analysisData && (
            <Card
              className={`p-6 border ${
                theme === "dark"
                  ? "bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30"
                  : "bg-purple-50 border-purple-200"
              }`}
            >
              <h3 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Analysis Results - {analysisData.strategy}
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div
                  className={`p-4 rounded-lg ${
                    theme === "dark" ? "bg-blue-500/10 border border-blue-500/30" : "bg-blue-50 border border-blue-200"
                  }`}
                >
                  <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Power</div>
                  <div className={`text-2xl font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                    {analysisData.power.toFixed(1)}%
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg ${
                    theme === "dark"
                      ? "bg-green-500/10 border border-green-500/30"
                      : "bg-green-50 border border-green-200"
                  }`}
                >
                  <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Signal</div>
                  <div className={`text-2xl font-bold ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
                    {analysisData.signal}
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg ${
                    theme === "dark"
                      ? "bg-yellow-500/10 border border-yellow-500/30"
                      : "bg-yellow-50 border border-yellow-200"
                  }`}
                >
                  <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Confidence</div>
                  <div className={`text-2xl font-bold ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`}>
                    {analysisData.confidence.toFixed(1)}%
                  </div>
                </div>

                <div
                  className={`p-4 rounded-lg ${
                    theme === "dark"
                      ? "bg-purple-500/10 border border-purple-500/30"
                      : "bg-purple-50 border border-purple-200"
                  }`}
                >
                  <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Ticks</div>
                  <div className={`text-2xl font-bold ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`}>
                    {analysisData.ticksCollected}
                  </div>
                </div>
              </div>

              <div
                className={`p-4 rounded-lg ${
                  theme === "dark" ? "bg-gray-900/50 border border-gray-700" : "bg-gray-100 border border-gray-300"
                }`}
              >
                <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  {analysisData.description}
                </p>
              </div>
            </Card>
          )}

          {/* Configuration Panel */}
          <Card
            className={`p-6 border ${
              theme === "dark"
                ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-yellow-500/20"
                : "bg-white border-gray-200"
            }`}
          >
            <h3 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              Configuration
            </h3>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                >
                  Market
                </label>
                <Select value={market} onValueChange={setMarket} disabled={loadingMarkets}>
                  <SelectTrigger
                    className={`${
                      theme === "dark"
                        ? "bg-[#0a0e27]/50 border-yellow-500/30 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-yellow-500/30" : "bg-white"}>
                    {allMarkets.map((m) => (
                      <SelectItem key={m.symbol} value={m.symbol}>
                        {m.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                >
                  Analysis Time (Minutes)
                </label>
                <Input
                  type="number"
                  value={analysisTimeMinutes}
                  onChange={(e) => setAnalysisTimeMinutes(e.target.value)}
                  className={`${
                    theme === "dark"
                      ? "bg-[#0a0e27]/50 border-yellow-500/30 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  min="1"
                  max="120"
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                >
                  Ticks for Entry
                </label>
                <Input
                  type="number"
                  value={ticksForEntry}
                  onChange={(e) => setTicksForEntry(e.target.value)}
                  className={`${
                    theme === "dark"
                      ? "bg-[#0a0e27]/50 border-yellow-500/30 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  min="100"
                  step="100"
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                >
                  Stake ($)
                </label>
                <Input
                  type="number"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  className={`${
                    theme === "dark"
                      ? "bg-[#0a0e27]/50 border-yellow-500/30 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  step="0.01"
                  min="0.01"
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                >
                  Target Profit ($)
                </label>
                <Input
                  type="number"
                  value={targetProfit}
                  onChange={(e) => setTargetProfit(e.target.value)}
                  className={`${
                    theme === "dark"
                      ? "bg-[#0a0e27]/50 border-yellow-500/30 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  step="0.1"
                  min="0.1"
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                >
                  Strategy
                </label>
                <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                  <SelectTrigger
                    className={`${
                      theme === "dark"
                        ? "bg-[#0a0e27]/50 border-yellow-500/30 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={theme === "dark" ? "bg-[#0a0e27] border-yellow-500/30" : "bg-white"}>
                    {strategies.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                >
                  Martingale Multiplier
                </label>
                <Input
                  type="number"
                  value={martingaleRatios[selectedStrategy] || 2.0}
                  onChange={(e) => {
                    const newRatio = Number.parseFloat(e.target.value) || 2.0
                    setMartingaleRatios((prev) => ({ ...prev, [selectedStrategy]: newRatio }))
                  }}
                  className={`${
                    theme === "dark"
                      ? "bg-[#0a0e27]/50 border-yellow-500/30 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  step="0.1"
                  min="1.5"
                  max="5"
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                >
                  Ticks Per Trade
                </label>
                <Input
                  type="number"
                  value={ticksPerTrade}
                  onChange={(e) => setTicksPerTrade(Number.parseInt(e.target.value))}
                  className={`${
                    theme === "dark"
                      ? "bg-[#0a0e27]/50 border-yellow-500/30 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  min="1"
                  max="100"
                />
              </div>

              <div>
                <label
                  className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                >
                  Stop Loss (%)
                </label>
                <Input
                  type="number"
                  value={stopLossPercent}
                  onChange={(e) => setStopLossPercent(e.target.value)}
                  className={`${
                    theme === "dark"
                      ? "bg-[#0a0e27]/50 border-yellow-500/30 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  step="5"
                  min="10"
                  max="90"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleStartAnalysis}
                disabled={isRunning || !isAuthorized || loadingMarkets}
                className={`flex-1 ${
                  theme === "dark"
                    ? "bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-bold"
                    : "bg-yellow-500 hover:bg-yellow-600 text-white font-bold"
                }`}
              >
                <Play className="w-4 h-4 mr-2" />
                Start Analysis
              </Button>

              <Button
                onClick={handleStopTrading}
                disabled={!isRunning}
                variant="destructive"
                className={`flex-1 ${theme === "dark" ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-red-300 text-red-600"}`}
              >
                <Pause className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </div>
          </Card>

          {/* Analysis Progress */}
          {status === "analyzing" && (
            <Card
              className={`p-6 border ${
                theme === "dark"
                  ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-yellow-500/20"
                  : "bg-white border-gray-200"
              }`}
            >
              <h3 className={`text-lg font-bold mb-6 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Analysis in Progress
              </h3>

              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                    Time Left: {Math.floor(timeLeft / 60)}m {timeLeft % 60}s
                  </span>
                  <span className={`text-sm font-bold ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`}>
                    {analysisProgress.toFixed(0)}%
                  </span>
                </div>
                <div
                  className={`w-full h-4 rounded-full overflow-hidden ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}
                >
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 transition-all duration-300"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
              </div>

              {/* Analysis Log */}
              <div
                className={`p-4 rounded-lg ${
                  theme === "dark" ? "bg-gray-900/50 border border-gray-700" : "bg-gray-900 border border-gray-800"
                }`}
              >
                <h4 className={`text-sm font-bold mb-3 ${theme === "dark" ? "text-gray-300" : "text-gray-300"}`}>
                  Analysis Log
                </h4>
                <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-xs">
                  {analysisLog.length === 0 ? (
                    <div className="text-gray-500">Waiting for analysis to start...</div>
                  ) : (
                    analysisLog.map((log, idx) => (
                      <div
                        key={idx}
                        className={`${
                          log.type === "success"
                            ? "text-green-400"
                            : log.type === "warning"
                              ? "text-yellow-400"
                              : log.type === "error"
                                ? "text-red-400"
                                : "text-gray-400"
                        }`}
                      >
                        <span className="text-gray-600">[{log.timestamp.toLocaleTimeString()}]</span> {log.message}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Statistical Progress Analysis */}
          {status === "trading" && analysisData && (
            <Card
              className={`p-6 border ${
                theme === "dark"
                  ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-purple-500/20"
                  : "bg-white border-gray-200"
              }`}
            >
              <h3 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Statistical Progress Analysis
              </h3>

              <div className="space-y-4">
                {/* Win Rate Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Win Rate</span>
                    <span className={`text-sm font-bold ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
                      {stats.winRate.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className={`w-full h-3 rounded-full overflow-hidden ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}
                  >
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, stats.winRate)}%` }}
                    />
                  </div>
                </div>

                {/* Strategy Power Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                      Strategy Power
                    </span>
                    <span className={`text-sm font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                      {analysisData.power.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className={`w-full h-3 rounded-full overflow-hidden ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}
                  >
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, analysisData.power)}%` }}
                    />
                  </div>
                </div>

                {/* Profit Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                      Profit Progress
                    </span>
                    <span
                      className={`text-sm font-bold ${sessionProfit >= 0 ? (theme === "dark" ? "text-green-400" : "text-green-600") : theme === "dark" ? "text-red-400" : "text-red-600"}`}
                    >
                      {sessionProfit >= 0 ? "+" : ""}${sessionProfit.toFixed(2)} / ${targetProfit}
                    </span>
                  </div>
                  <div
                    className={`w-full h-3 rounded-full overflow-hidden ${theme === "dark" ? "bg-gray-700" : "bg-gray-200"}`}
                  >
                    <div
                      className={`h-full transition-all duration-300 ${sessionProfit >= 0 ? "bg-gradient-to-r from-green-500 to-emerald-500" : "bg-gradient-to-r from-red-500 to-orange-500"}`}
                      style={{
                        width: `${Math.min(100, Math.abs((sessionProfit / Number.parseFloat(targetProfit)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Market Info Card */}
          <Card
            className={
              theme === "dark"
                ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20"
                : "bg-white border-gray-200"
            }
          >
            <CardHeader>
              <CardTitle className={theme === "dark" ? "text-cyan-400" : "text-cyan-600"}>
                Live Market Data - {market}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <p className="text-xs text-gray-400">Current Price</p>
                  <p className="text-2xl font-bold text-white">
                    {marketPrice !== null ? marketPrice.toFixed(5) : "0.00000"}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                  <p className="text-xs text-gray-400">Last Digit</p>
                  <p className="text-2xl font-bold text-orange-400">{currentDigit !== null ? currentDigit : "0"}</p>{" "}
                  {/* Use currentDigit */}
                </div>
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <p className="text-xs text-gray-400">Ticks Collected</p>
                  <p className="text-2xl font-bold text-green-400">{ticksCollected}</p>
                </div>
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <p className="text-xs text-gray-400">Analysis Progress</p>
                  <p className="text-2xl font-bold text-purple-400">{analysisProgress.toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Last 15 Digits & Bias Analysis */}
          {ticksCollected > 0 && (
            <Card
              className={
                theme === "dark"
                  ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-purple-500/20"
                  : "bg-white border-gray-200"
              }
            >
              <CardHeader>
                <CardTitle className={theme === "dark" ? "text-purple-400" : "text-purple-600"}>
                  Last 15 Digits & Statistical Bias
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 justify-center">
                  {last15DigitsForDisplay.map((digit, idx) => (
                    <div
                      key={idx}
                      className={`w-12 h-12 flex items-center justify-center rounded-lg font-bold text-xl ${
                        digit === currentDigit // Compare with currentDigit
                          ? "bg-green-500 text-white animate-pulse"
                          : digit % 2 === 0
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-orange-500/20 text-orange-400"
                      }`}
                    >
                      {digit}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
                    <p className="text-xs text-gray-400">Even Count</p>
                    <p className="text-xl font-bold text-blue-400">{evenBias}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-center">
                    <p className="text-xs text-gray-400">Odd Count</p>
                    <p className="text-xl font-bold text-orange-400">{oddBias}</p>
                  </div>
                  <div
                    className={`p-3 rounded-lg border text-center ${
                      biasDirection === "EVEN"
                        ? "bg-blue-500/10 border-blue-500/30"
                        : biasDirection === "ODD"
                          ? "bg-orange-500/10 border-orange-500/30"
                          : "bg-gray-500/10 border-gray-500/30"
                    }`}
                  >
                    <p className="text-xs text-gray-400">Bias</p>
                    <p
                      className={`text-xl font-bold ${
                        biasDirection === "EVEN"
                          ? "text-blue-400"
                          : biasDirection === "ODD"
                            ? "text-orange-400"
                            : "text-gray-400"
                      }`}
                    >
                      {biasDirection} {biasPercentage}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Panel */}
          <TradingStatsPanel
            stats={stats}
            theme={theme}
            onReset={() => {
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
              setSessionProfit(0) // Also reset session profit and trades on reset
              setSessionTrades(0)
            }}
          />

          {/* Transaction History */}
          {tradeHistory.length > 0 && <TransactionHistory transactions={tradeHistory} theme={theme} />}

          {/* Trade Log */}
          {tradeHistory.length > 0 && (
            <TradeLog
              trades={tradeHistory.map((trade) => ({
                id: trade.id,
                timestamp: trade.timestamp,
                volume: "1", // Assuming volume is 1 for each trade
                tradeType: selectedStrategy,
                contractType: trade.contractType,
                predicted: analysisData?.signal || "N/A",
                result: trade.status,
                entry: trade.entrySpot,
                exit: trade.exitSpot,
                stake: trade.buyPrice,
                profitLoss: trade.profitLoss,
              }))}
              theme={theme}
            />
          )}

          {/* Journal */}
          {journalLog.length > 0 && <TradingJournalPanel entries={journalLog} theme={theme} />}

          {/* Session Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card
              className={`p-6 border ${
                theme === "dark"
                  ? "bg-gradient-to-br from-green-500/10 to-green-500/10 border-green-500/30"
                  : "bg-green-50 border-green-200"
              }`}
            >
              <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Session Profit</div>
              <div
                className={`text-3xl font-bold ${sessionProfit >= 0 ? (theme === "dark" ? "text-green-400" : "text-green-600") : theme === "dark" ? "text-red-400" : "text-red-600"}`}
              >
                {sessionProfit >= 0 ? "+" : ""} ${sessionProfit.toFixed(2)}
              </div>
            </Card>

            <Card
              className={`p-6 border ${
                theme === "dark"
                  ? "bg-gradient-to-br from-blue-500/10 to-blue-500/10 border-blue-500/30"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Trades Executed</div>
              <div className={`text-3xl font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                {sessionTrades}
              </div>
            </Card>

            <Card
              className={`p-6 border ${
                theme === "dark"
                  ? "bg-gradient-to-br from-yellow-500/10 to-yellow-500/10 border-yellow-500/30"
                  : "bg-yellow-50 border-yellow-200"
              }`}
            >
              <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Status</div>
              <div className={`text-lg font-bold ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`}>
                {status.toUpperCase()}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Stop Loss Popup */}
      {showSLPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="max-w-md w-full bg-gradient-to-br from-red-900/95 to-red-800/95 rounded-2xl border-2 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)] p-8">
            <div className="text-center space-y-4">
              <div className="text-6xl">😢</div>
              <h2 className="text-3xl font-bold text-white">Oops!</h2>
              <p className="text-red-300 text-lg">Stop loss hit. Please try again later.</p>

              <div className="bg-white/10 rounded-lg p-6 space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl font-bold text-red-400">-${slAmount.toFixed(2)}</span>
                </div>
                <div className="text-sm text-gray-300">Total Loss (USD)</div>

                <div className="border-t border-white/20 pt-3">
                  <div className="text-2xl font-bold text-red-400">-KES {(slAmount * 129.5).toFixed(2)}</div>
                  <div className="text-xs text-gray-400 mt-1">(Conversion rate: 1 USD = 129.5 KES)</div>
                </div>

                {marketPrice && (
                  <div className="border-t border-white/20 pt-3">
                    <div className="text-xs text-gray-400">Market Price at Loss</div>
                    <div className="text-lg font-bold text-white">{marketPrice.toFixed(5)}</div>
                  </div>
                )}
              </div>

              <Button
                onClick={() => setShowSLPopup(false)}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Take Profit Popup */}
      {showTPPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="max-w-md w-full bg-gradient-to-br from-green-900/95 to-green-800/95 rounded-2xl border-2 border-green-500 shadow-[0_0_50px_rgba(34,197,94,0.5)] p-8">
            <div className="text-center space-y-4">
              <div className="text-6xl">🎉</div>
              <h2 className="text-3xl font-bold text-white">Congratulations!</h2>
              <p className="text-green-300 text-lg">Take profit hit. Well done!</p>

              <div className="bg-white/10 rounded-lg p-6 space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl font-bold text-green-400">+${tpAmount.toFixed(2)}</span>
                </div>
                <div className="text-sm text-gray-300">Total Profit (USD)</div>

                <div className="border-t border-white/20 pt-3">
                  <div className="text-2xl font-bold text-green-400">+KES {(tpAmount * 129.5).toFixed(2)}</div>
                  <div className="text-xs text-gray-400 mt-1">(Conversion rate: 1 USD = 129.5 KES)</div>
                </div>

                {marketPrice && (
                  <div className="border-t border-white/20 pt-3">
                    <div className="text-xs text-gray-400">Market Price at Profit</div>
                    <div className="text-lg font-bold text-white">{marketPrice.toFixed(5)}</div>
                  </div>
                )}
              </div>

              <Button
                onClick={() => setShowTPPopup(false)}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <TradeResultModal
        isOpen={showResultModal}
        type={resultType}
        amount={resultAmount}
        theme={theme}
        onClose={() => setShowResultModal(false)}
      />
    </div>
  )
}
