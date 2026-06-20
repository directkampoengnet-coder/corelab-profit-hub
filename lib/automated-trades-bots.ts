import type DerivAPIBasic from "@deriv/deriv-api/dist/DerivAPIBasic"

export interface AutomatedBotConfig {
  accountBalance: number
  targetProfitPercent: number // Target 10% of account balance
  minStakePercent: number // Min 2% of balance
  maxStakePercent: number // Max 5% of balance
  duration: number
  durationUnit: string
}

export interface MarketAnalysis {
  symbol: string
  score: number
  recommendation: string
  confidence: number
  lastDigit: number
  digitFrequencies: Record<number, number>
  trends: {
    even: number
    odd: number
    over3: number
    under6: number
    over2: number
    under7: number
    over1: number
    under8: number
    over0: number
    under9: number
    differs: number
  }
}

export interface TradingSignal {
  market: string
  contractType: string
  barrier?: string
  entryPoint: string
  confidence: number
  expectedPayout: number
  stake: number
}

export class AutomatedTradesBot {
  private apiClient: DerivAPIBasic
  private config: AutomatedBotConfig
  private isRunning: boolean = false
  private tickHistory: Map<string, number[]> = new Map()
  private tickCache: Map<string, { ticks: number[], timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 60000 // 1 minute cache
  private readonly MARKETS = [
    "1HZ10V", "1HZ25V", "1HZ50V", "1HZ75V", "1HZ100V",
    "R_10", "R_25", "R_50", "R_75", "R_100"
  ]

  constructor(apiClient: DerivAPIBasic, config: AutomatedBotConfig) {
    this.apiClient = apiClient
    this.config = config
  }

  async analyzeMarket(symbol: string): Promise<MarketAnalysis> {
    const ticks = await this.fetchTickHistory(symbol, 100)
    const digitFrequencies: Record<number, number> = {}
    
    // Calculate digit frequencies
    for (let i = 0; i <= 9; i++) {
      digitFrequencies[i] = ticks.filter(t => t === i).length
    }

    const lastDigit = ticks[ticks.length - 1] || 0
    const totalTicks = ticks.length

    // Calculate trends
    const evenCount = ticks.filter(d => d % 2 === 0).length
    const oddCount = totalTicks - evenCount
    const over3Count = ticks.filter(d => d >= 4).length
    const under6Count = ticks.filter(d => d <= 5).length
    const over2Count = ticks.filter(d => d >= 3).length
    const under7Count = ticks.filter(d => d <= 6).length
    const over1Count = ticks.filter(d => d >= 2).length
    const under8Count = ticks.filter(d => d <= 7).length
    const over0Count = ticks.filter(d => d >= 1).length
    const under9Count = ticks.filter(d => d <= 8).length

    const leastFrequent = Object.entries(digitFrequencies)
      .filter(([d]) => Number(d) >= 2 && Number(d) <= 7)
      .reduce((min, curr) => curr[1] < min[1] ? curr : min)
    const differsScore = 100 - ((leastFrequent[1] / totalTicks) * 100)

    const trends = {
      even: (evenCount / totalTicks) * 100,
      odd: (oddCount / totalTicks) * 100,
      over3: (over3Count / totalTicks) * 100,
      under6: (under6Count / totalTicks) * 100,
      over2: (over2Count / totalTicks) * 100,
      under7: (under7Count / totalTicks) * 100,
      over1: (over1Count / totalTicks) * 100,
      under8: (under8Count / totalTicks) * 100,
      over0: (over0Count / totalTicks) * 100,
      under9: (under9Count / totalTicks) * 100,
      differs: differsScore,
    }

    // Calculate market score based on predictability
    const volatility = this.calculateVolatility(ticks)
    const trendStrength = Math.max(...Object.values(trends))
    const score = (trendStrength - 50) * 2 + (100 - volatility)

    let recommendation = "WAIT"
    let confidence = 0

    if (score > 15) {
      recommendation = "EXCELLENT"
      confidence = Math.min(95, 70 + score)
    } else if (score > 10) {
      recommendation = "GOOD"
      confidence = Math.min(85, 60 + score)
    } else if (score > 5) {
      recommendation = "MODERATE"
      confidence = Math.min(75, 50 + score)
    }

    return {
      symbol,
      score,
      recommendation,
      confidence,
      lastDigit,
      digitFrequencies,
      trends,
    }
  }

  async findBestMarket(): Promise<MarketAnalysis> {
    const analyses = await Promise.all(
      this.MARKETS.map(market => this.analyzeMarket(market))
    )

    return analyses.reduce((best, current) => 
      current.score > best.score ? current : best
    )
  }

  async generateSignalForStrategy(analysis: MarketAnalysis, strategy: string): Promise<TradingSignal | null> {
    const { trends, lastDigit, confidence, symbol } = analysis

    // Only trade on high confidence signals (>65%)
    if (confidence < 65) return null

    // Calculate stake (2-5% of balance)
    const stakePercent = Math.min(
      this.config.maxStakePercent,
      this.config.minStakePercent + (confidence - 65) / 10
    )
    const stake = (this.config.accountBalance * stakePercent) / 100

    let contractType = ""
    let barrier = ""
    let entryPoint = ""

    // Strategy selection logic
    if (strategy === "auto") {
      // Find best strategy automatically
      return this.generateSignal(analysis)
    } else if (strategy === "differs") {
      const leastFrequentDigit = Object.entries(analysis.digitFrequencies)
        .filter(([d]) => Number(d) >= 2 && Number(d) <= 7)
        .reduce((min, curr) => curr[1] < min[1] ? curr : min)

      if (leastFrequentDigit[1] < 10) {
        contractType = "DIGITDIFF"
        barrier = leastFrequentDigit[0]
        entryPoint = `Wait 3 ticks without seeing ${barrier}, then trade`
      }
    } else if (strategy === "over0" && trends.over0 > 60) {
      contractType = "DIGITOVER"
      barrier = "0"
      const highestDigit = Math.max(...Object.keys(analysis.digitFrequencies)
        .filter(d => Number(d) >= 1).map(Number))
      entryPoint = `Trade when digit ${highestDigit} appears`
    } else if (strategy === "over1" && trends.over1 > 60) {
      contractType = "DIGITOVER"
      barrier = "1"
      const highestDigit = Math.max(...Object.keys(analysis.digitFrequencies)
        .filter(d => Number(d) >= 2).map(Number))
      entryPoint = `Trade when digit ${highestDigit} appears`
    } else if (strategy === "over2" && trends.over2 > 60) {
      contractType = "DIGITOVER"
      barrier = "2"
      const highestDigit = Math.max(...Object.keys(analysis.digitFrequencies)
        .filter(d => Number(d) >= 3).map(Number))
      entryPoint = `Trade when digit ${highestDigit} appears`
    } else if (strategy === "under7" && trends.under7 > 60) {
      contractType = "DIGITUNDER"
      barrier = "7"
      const highestDigit = Math.max(...Object.keys(analysis.digitFrequencies)
        .filter(d => Number(d) <= 6).map(Number))
      entryPoint = `Trade when digit ${highestDigit} appears`
    } else if (strategy === "under8" && trends.under8 > 60) {
      contractType = "DIGITUNDER"
      barrier = "8"
      const highestDigit = Math.max(...Object.keys(analysis.digitFrequencies)
        .filter(d => Number(d) <= 7).map(Number))
      entryPoint = `Trade when digit ${highestDigit} appears`
    } else if (strategy === "under9" && trends.under9 > 60) {
      contractType = "DIGITUNDER"
      barrier = "9"
      const highestDigit = Math.max(...Object.keys(analysis.digitFrequencies)
        .filter(d => Number(d) <= 8).map(Number))
      entryPoint = `Trade when digit ${highestDigit} appears`
    }

    if (!contractType) return null

    const expectedPayout = stake * 1.9

    return {
      market: symbol,
      contractType,
      barrier,
      entryPoint,
      confidence,
      expectedPayout,
      stake: Math.round(stake * 100) / 100,
    }
  }

  async generateSignal(analysis: MarketAnalysis): Promise<TradingSignal | null> {
    const { trends, lastDigit, confidence, symbol } = analysis

    // Only trade on high confidence signals (>65%)
    if (confidence < 65) return null

    // Calculate stake (2-5% of balance)
    const stakePercent = Math.min(
      this.config.maxStakePercent,
      this.config.minStakePercent + (confidence - 65) / 10
    )
    const stake = (this.config.accountBalance * stakePercent) / 100

    // Find strongest trend
    const trendEntries = Object.entries(trends)
    const strongestTrend = trendEntries.reduce((max, curr) => 
      curr[1] > max[1] ? curr : max
    )

    const [trendName, trendValue] = strongestTrend

    // Only trade when trend is > 60%
    if (trendValue < 60) return null

    let contractType = ""
    let barrier = ""
    let entryPoint = ""

    // DIFFERS Bot Logic
    if (trendName.startsWith("differ")) {
      const leastFrequentDigit = Object.entries(analysis.digitFrequencies)
        .filter(([d]) => Number(d) >= 2 && Number(d) <= 7)
        .reduce((min, curr) => curr[1] < min[1] ? curr : min)

      if (leastFrequentDigit[1] < 10) {
        contractType = "DIGITDIFF"
        barrier = leastFrequentDigit[0]
        entryPoint = `Wait 3 ticks without seeing ${barrier}, then trade`
      }
    }
    // OVER/UNDER Bots
    else if (trendName === "over0" && trendValue > 60) {
      contractType = "DIGITOVER"
      barrier = "0"
      const highestDigit = Math.max(...Object.keys(analysis.digitFrequencies)
        .filter(d => Number(d) >= 1)
        .map(Number))
      entryPoint = `Trade when digit ${highestDigit} appears (highest in over 0 range)`
    }
    else if (trendName === "over1" && trendValue > 60) {
      contractType = "DIGITOVER"
      barrier = "1"
      const highestDigit = Math.max(...Object.keys(analysis.digitFrequencies)
        .filter(d => Number(d) >= 2)
        .map(Number))
      entryPoint = `Trade when digit ${highestDigit} appears (highest in over 1 range)`
    }
    else if (trendName === "over2" && trendValue > 60) {
      contractType = "DIGITOVER"
      barrier = "2"
      const highestDigit = Math.max(...Object.keys(analysis.digitFrequencies)
        .filter(d => Number(d) >= 3)
        .map(Number))
      entryPoint = `Trade when digit ${highestDigit} appears (highest in over 2 range)`
    }
    else if (trendName === "under9" && trendValue > 60) {
      contractType = "DIGITUNDER"
      barrier = "9"
      const highestDigit = Math.max(...Object.keys(analysis.digitFrequencies)
        .filter(d => Number(d) <= 8)
        .map(Number))
      entryPoint = `Trade when digit ${highestDigit} appears (highest in under 9 range)`
    }
    else if (trendName === "under8" && trendValue > 60) {
      contractType = "DIGITUNDER"
      barrier = "8"
      const highestDigit = Math.max(...Object.keys(analysis.digitFrequencies)
        .filter(d => Number(d) <= 7)
        .map(Number))
      entryPoint = `Trade when digit ${highestDigit} appears (highest in under 8 range)`
    }
    else if (trendName === "under7" && trendValue > 60) {
      contractType = "DIGITUNDER"
      barrier = "7"
      const highestDigit = Math.max(...Object.keys(analysis.digitFrequencies)
        .filter(d => Number(d) <= 6)
        .map(Number))
      entryPoint = `Trade when digit ${highestDigit} appears (highest in under 7 range)`
    }

    if (!contractType) return null

    const targetProfit = (this.config.accountBalance * this.config.targetProfitPercent) / 100
    const expectedPayout = stake * 1.9 // Approximate payout multiplier

    return {
      market: symbol,
      contractType,
      barrier,
      entryPoint,
      confidence,
      expectedPayout,
      stake: Math.round(stake * 100) / 100,
    }
  }

  private async fetchTickHistory(symbol: string, count: number): Promise<number[]> {
    // Check cache first
    const cached = this.tickCache.get(symbol)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`[v0] Using cached tick data for ${symbol}`)
      return cached.ticks
    }

    try {
      const response = await this.apiClient.send({
        ticks_history: symbol,
        count,
        end: "latest",
        style: "ticks",
      })

      if (response.history?.prices) {
        const ticks = response.history.prices.map((price: number) => 
          Number(price.toFixed(2).slice(-1))
        )
        // Cache the result
        this.tickCache.set(symbol, { ticks, timestamp: Date.now() })
        return ticks
      }
      return []
    } catch (error) {
      console.error("[v0] Error fetching tick history:", error)
      // Return cached data if available, even if expired
      if (cached) {
        console.log(`[v0] Returning expired cache for ${symbol} due to error`)
        return cached.ticks
      }
      return []
    }
  }

  private calculateVolatility(ticks: number[]): number {
    if (ticks.length < 2) return 0
    
    const changes = ticks.slice(1).map((tick, i) => Math.abs(tick - ticks[i]))
    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length
    
    return (avgChange / 9) * 100
  }

  stop() {
    this.isRunning = false
    this.tickCache.clear()
  }

  async executeTradeSignal(signal: TradingSignal): Promise<void> {
    try {
      console.log(`[v0] Executing trade: ${signal.contractType} ${signal.barrier} on ${signal.market} with stake $${signal.stake}`)
      
      const proposal = await this.apiClient.send({
        proposal: 1,
        amount: signal.stake,
        basis: "stake",
        contract_type: signal.contractType,
        currency: "USD",
        duration: this.config.duration,
        duration_unit: this.config.durationUnit,
        symbol: signal.market,
        barrier: signal.barrier,
      })

      if (proposal.proposal) {
        const buyResponse = await this.apiClient.send({
          buy: proposal.proposal.id,
          price: signal.stake,
        })
        
        console.log(`[v0] Trade executed successfully:`, buyResponse)
      }
    } catch (error) {
      console.error("[v0] Error executing trade:", error)
    }
  }
}
