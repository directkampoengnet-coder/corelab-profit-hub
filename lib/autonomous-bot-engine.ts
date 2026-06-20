import type { DerivAPIClient } from "./deriv-api"

export interface MarketAnalysis {
  symbol: string
  digitFrequencies: Record<number, number>
  digitPercentages: Record<number, number>
  overUnderBias: { over: number; under: number; direction: "OVER" | "UNDER" }
  evenOddBias: { even: number; odd: number; direction: "EVEN" | "ODD" }
  stability: number
  recommendedStrategy: string
  confidence: number
}

export interface TradeSignal {
  strategy: string
  contractType: string
  barrier?: string
  confidence: number
  reason: string
}

export interface AutonomousBotConfig {
  apiToken: string
  autoMarketSelection: boolean
  selectedMarket?: string
  stake: number
  duration: number
  durationUnit: string
  takeProfit: number
  stopLoss: number
  martingaleMultiplier: number
  tradesPerHour: number
}

export interface BotState {
  isRunning: boolean
  currentMarket: string
  currentStrategy: string
  totalTrades: number
  wins: number
  losses: number
  totalProfit: number
  currentStake: number
  consecutiveLosses: number
  analysisProgress: string
  connectionStatus: "connected" | "reconnecting" | "disconnected"
}

export class AutonomousBotEngine {
  private api: DerivAPIClient
  private config: AutonomousBotConfig
  private state: BotState
  private tickHistory: Map<string, number[]> = new Map()
  private onStateUpdate: ((state: BotState) => void) | null = null
  private onTradeJournal: ((entry: string) => void) | null = null
  private isRunning = false
  private tradeQueue: number[] = []

  constructor(api: DerivAPIClient, config: AutonomousBotConfig) {
    this.api = api
    this.config = config
    this.state = {
      isRunning: false,
      currentMarket: config.selectedMarket || "R_100",
      currentStrategy: "ANALYZING",
      totalTrades: 0,
      wins: 0,
      losses: 0,
      totalProfit: 0,
      currentStake: config.stake,
      consecutiveLosses: 0,
      analysisProgress: "Initializing...",
      connectionStatus: "disconnected",
    }
  }

  async start(onStateUpdate: (state: BotState) => void, onTradeJournal: (entry: string) => void) {
    this.onStateUpdate = onStateUpdate
    this.onTradeJournal = onTradeJournal
    this.isRunning = true
    this.state.isRunning = true

    this.log("Starting Autonomous Bot Engine...")

    try {
      // Connect to API
      await this.api.connect()
      await this.api.authorize(this.config.apiToken)
      this.state.connectionStatus = "connected"
      this.updateUI()

      // Start main loop
      await this.runMainLoop()
    } catch (error: any) {
      this.log(`Error: ${error.message}`)
      this.state.connectionStatus = "disconnected"
      this.updateUI()
    }
  }

  stop() {
    this.isRunning = false
    this.state.isRunning = false
    this.log("Bot stopped")
    this.updateUI()
  }

  private async runMainLoop() {
    while (this.isRunning) {
      try {
        // Check stop conditions
        if (this.shouldStop()) {
          this.stop()
          break
        }

        // Auto market selection if enabled
        if (this.config.autoMarketSelection) {
          this.state.analysisProgress = "Analyzing markets..."
          this.updateUI()
          await this.selectBestMarket()
        }

        // Analyze current market
        this.state.analysisProgress = "Analyzing market..."
        this.updateUI()
        const analysis = await this.analyzeMarket(this.state.currentMarket)

        // Get trade signal
        const signal = this.getTradeSignal(analysis)

        if (signal && signal.confidence >= 0.62) {
          this.state.analysisProgress = `Entry Confirmed: Trading ${signal.strategy}`
          this.updateUI()

          // Execute trade
          await this.executeTrade(signal)

          // Rate limiting
          const delayMs = (3600000 / this.config.tradesPerHour) * 1000
          await this.delay(delayMs)
        } else {
          await this.delay(2000)
        }
      } catch (error: any) {
        this.log(`Error in main loop: ${error.message}`)
        await this.delay(5000)
      }
    }
  }

  private async selectBestMarket() {
    try {
      const symbols = await this.api.getActiveSymbols()
      const digitMarkets = (symbols || []).filter(
        (s: any) =>
          s?.market === "synthetic_index" ||
          s?.submarket?.includes("random") ||
          s?.symbol?.startsWith("R_") ||
          s?.symbol?.startsWith("1HZ"),
      )

      if (!digitMarkets || digitMarkets.length === 0) {
        this.log("No digit markets found, using default")
        return
      }

      let bestMarket = digitMarkets[0]
      let bestScore = 0

      for (const market of digitMarkets.slice(0, 5)) {
        const analysis = await this.analyzeMarket(market.symbol)
        const score = analysis.stability * analysis.confidence

        this.state.analysisProgress = `Analyzing ${market.display_name}: Stability ${(analysis.stability * 100).toFixed(0)}%`
        this.updateUI()

        if (score > bestScore) {
          bestScore = score
          bestMarket = market
        }
      }

      this.state.currentMarket = bestMarket.symbol
      this.log(`Selected market: ${bestMarket.display_name}`)
    } catch (error: any) {
      this.log(`Market selection error: ${error.message}`)
    }
  }

  private async analyzeMarket(symbol: string): Promise<MarketAnalysis> {
    try {
      // Fetch tick history
      const history = await this.api.getTickHistory(symbol, 100)

      // Calculate digit frequencies
      const digitFrequencies: Record<number, number> = {}
      const digitPercentages: Record<number, number> = {}

      for (let i = 0; i <= 9; i++) {
        digitFrequencies[i] = 0
      }

      history.prices.forEach((price: number) => {
        const digit = this.getLastDigit(price)
        digitFrequencies[digit]++
      })

      // Calculate percentages
      for (let i = 0; i <= 9; i++) {
        digitPercentages[i] = (digitFrequencies[i] / history.prices.length) * 100
      }

      // Calculate biases
      const overCount = Object.keys(digitFrequencies)
        .filter((d) => Number.parseInt(d) >= 5)
        .reduce((sum, d) => sum + digitFrequencies[Number.parseInt(d)], 0)
      const underCount = history.prices.length - overCount

      const evenCount = Object.keys(digitFrequencies)
        .filter((d) => Number.parseInt(d) % 2 === 0)
        .reduce((sum, d) => sum + digitFrequencies[Number.parseInt(d)], 0)
      const oddCount = history.prices.length - evenCount

      const overPercent = (overCount / history.prices.length) * 100
      const underPercent = (underCount / history.prices.length) * 100
      const evenPercent = (evenCount / history.prices.length) * 100
      const oddPercent = (oddCount / history.prices.length) * 100

      // Calculate stability (variance)
      const mean = history.prices.reduce((a, b) => a + b, 0) / history.prices.length
      const variance = history.prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / history.prices.length
      const stability = Math.min(1, 1 / (1 + Math.sqrt(variance)))

      // Determine recommended strategy
      let recommendedStrategy = "EVEN_ODD"
      let confidence = Math.abs(evenPercent - oddPercent) / 100

      if (Math.abs(overPercent - underPercent) / 100 > confidence) {
        recommendedStrategy = overPercent > underPercent ? "UNDER_7" : "OVER_2"
        confidence = Math.abs(overPercent - underPercent) / 100
      }

      return {
        symbol,
        digitFrequencies,
        digitPercentages,
        overUnderBias: {
          over: overPercent,
          under: underPercent,
          direction: overPercent > underPercent ? "OVER" : "UNDER",
        },
        evenOddBias: {
          even: evenPercent,
          odd: oddPercent,
          direction: evenPercent > oddPercent ? "EVEN" : "ODD",
        },
        stability,
        recommendedStrategy,
        confidence,
      }
    } catch (error: any) {
      this.log(`Analysis error: ${error.message}`)
      return {
        symbol,
        digitFrequencies: {},
        digitPercentages: {},
        overUnderBias: { over: 50, under: 50, direction: "OVER" },
        evenOddBias: { even: 50, odd: 50, direction: "EVEN" },
        stability: 0.5,
        recommendedStrategy: "EVEN_ODD",
        confidence: 0.5,
      }
    }
  }

  private getTradeSignal(analysis: MarketAnalysis): TradeSignal | null {
    const { overUnderBias, evenOddBias, digitPercentages, recommendedStrategy } = analysis

    // Strategy 1: UNDER 7
    if (overUnderBias.under >= 60 && digitPercentages[7] < 10) {
      return {
        strategy: "UNDER_7",
        contractType: "DIGITUNDER",
        barrier: "7",
        confidence: overUnderBias.under / 100,
        reason: `Under bias ${overUnderBias.under.toFixed(1)}% detected`,
      }
    }

    // Strategy 2: OVER 2
    if (overUnderBias.over >= 60 && digitPercentages[2] < 10) {
      return {
        strategy: "OVER_2",
        contractType: "DIGITOVER",
        barrier: "2",
        confidence: overUnderBias.over / 100,
        reason: `Over bias ${overUnderBias.over.toFixed(1)}% detected`,
      }
    }

    // Strategy 3: OVER 3
    if (overUnderBias.over >= 65 && digitPercentages[3] < 12) {
      return {
        strategy: "OVER_3",
        contractType: "DIGITOVER",
        barrier: "3",
        confidence: overUnderBias.over / 100,
        reason: `Strong over bias ${overUnderBias.over.toFixed(1)}% detected`,
      }
    }

    // Strategy 4: UNDER 6
    if (overUnderBias.under >= 65 && digitPercentages[6] < 12) {
      return {
        strategy: "UNDER_6",
        contractType: "DIGITUNDER",
        barrier: "6",
        confidence: overUnderBias.under / 100,
        reason: `Strong under bias ${overUnderBias.under.toFixed(1)}% detected`,
      }
    }

    // Strategy 5: EVEN/ODD
    if (evenOddBias.even >= 60) {
      return {
        strategy: "EVEN_ODD",
        contractType: "DIGITODD",
        confidence: evenOddBias.even / 100,
        reason: `Even bias ${evenOddBias.even.toFixed(1)}% detected`,
      }
    }

    if (evenOddBias.odd >= 60) {
      return {
        strategy: "EVEN_ODD",
        contractType: "DIGITEVEN",
        confidence: evenOddBias.odd / 100,
        reason: `Odd bias ${evenOddBias.odd.toFixed(1)}% detected`,
      }
    }

    return null
  }

  private async executeTrade(signal: TradeSignal) {
    try {
      const tradeParams: any = {
        symbol: this.state.currentMarket,
        contract_type: signal.contractType,
        amount: this.state.currentStake,
        basis: "stake",
        duration: this.config.duration,
        duration_unit: this.config.durationUnit,
        currency: "USD",
      }

      if (signal.barrier) {
        tradeParams.barrier = signal.barrier
      }

      // Get proposal
      const proposal = await this.api.getProposal(tradeParams)

      // Buy contract
      const contract = await this.api.buyContract(proposal.id, proposal.ask_price)

      this.state.totalTrades++
      this.state.currentStrategy = signal.strategy

      // Monitor contract
      const result = await this.monitorContract(contract.contract_id)

      // Handle result
      if (result.profit > 0) {
        this.state.wins++
        this.state.totalProfit += result.profit
        this.state.currentStake = this.config.stake
        this.state.consecutiveLosses = 0
        this.log(`WIN: ${signal.strategy} +$${result.profit.toFixed(2)}`)
      } else {
        this.state.losses++
        this.state.totalProfit += result.profit
        this.state.consecutiveLosses++

        // Apply martingale
        const multipliers: Record<string, number> = {
          UNDER_7: 3.5,
          OVER_2: 3.5,
          OVER_3: 2.8,
          UNDER_6: 2.8,
          EVEN_ODD: 2.1,
        }

        const multiplier = multipliers[signal.strategy] || 2.1
        this.state.currentStake = Math.min(this.state.currentStake * multiplier, 1000)
        this.log(`LOSS: ${signal.strategy} -$${Math.abs(result.profit).toFixed(2)} | Martingale x${multiplier}`)
      }

      this.updateUI()
    } catch (error: any) {
      this.log(`Trade execution error: ${error.message}`)
    }
  }

  private async monitorContract(contractId: number): Promise<{ profit: number }> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Contract monitoring timeout"))
      }, 120000)

      this.api
        .subscribeProposalOpenContract(contractId, (contract) => {
          if (contract.is_sold) {
            clearTimeout(timeout)
            resolve({ profit: contract.profit || 0 })
          }
        })
        .catch((error) => {
          clearTimeout(timeout)
          reject(error)
        })
    })
  }

  private shouldStop(): boolean {
    if (this.state.totalProfit >= this.config.takeProfit) {
      this.log("Take Profit reached!")
      return true
    }

    if (this.state.totalProfit <= -this.config.stopLoss) {
      this.log("Stop Loss triggered!")
      return true
    }

    return false
  }

  private getLastDigit(price: number): number {
    const priceStr = price.toFixed(5)
    return Number.parseInt(priceStr[priceStr.length - 1])
  }

  private updateUI() {
    if (this.onStateUpdate) {
      this.onStateUpdate({ ...this.state })
    }
  }

  private log(message: string) {
    const timestamp = new Date().toLocaleTimeString()
    const entry = `[${timestamp}] ${message}`
    console.log(`[v0] ${entry}`)
    if (this.onTradeJournal) {
      this.onTradeJournal(entry)
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  getState(): BotState {
    return { ...this.state }
  }
}
