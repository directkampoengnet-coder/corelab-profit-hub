"use client"

import { EventEmitter } from "events"

export interface BackgroundTradeConfig {
  market: string
  stake: number
  targetProfit: number
  maxLoss: number
  martingaleMultiplier: number
  analysisTimeMinutes: number
  ticksForEntry: number
}

export interface BackgroundTradeState {
  isRunning: boolean
  sessionProfit: number
  sessionLosses: number
  totalTrades: number
  wins: number
  losses: number
  lastTradeTime: Date | null
  targetReached: boolean
  maxLossReached: boolean
}

export class BackgroundTradingService extends EventEmitter {
  private config: BackgroundTradeConfig
  private state: BackgroundTradeState
  private tradeInterval: NodeJS.Timeout | null = null
  private analysisInterval: NodeJS.Timeout | null = null

  constructor(config: BackgroundTradeConfig) {
    super()
    this.config = config
    this.state = {
      isRunning: false,
      sessionProfit: 0,
      sessionLosses: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      lastTradeTime: null,
      targetReached: false,
      maxLossReached: false,
    }
  }

  start() {
    if (this.state.isRunning) return

    this.state.isRunning = true
    this.emit("started")

    // Start analysis phase
    this.startAnalysis()
  }

  stop() {
    this.state.isRunning = false
    if (this.tradeInterval) clearInterval(this.tradeInterval)
    if (this.analysisInterval) clearInterval(this.analysisInterval)
    this.emit("stopped")
  }

  private startAnalysis() {
    const analysisDuration = this.config.analysisTimeMinutes * 60 * 1000
    this.emit("analysis-started", { duration: analysisDuration })

    setTimeout(() => {
      if (!this.state.isRunning) return
      this.emit("analysis-complete")
      this.startTrading()
    }, analysisDuration)
  }

  private startTrading() {
    this.emit("trading-started")

    // Execute trades every 3 seconds
    this.tradeInterval = setInterval(() => {
      if (!this.state.isRunning) return

      this.executeTrade()

      // Check if target profit reached
      if (this.state.sessionProfit >= this.config.targetProfit) {
        this.state.targetReached = true
        this.emit("target-reached", { profit: this.state.sessionProfit })
        this.stop()
        return
      }

      // Check if max loss reached
      if (this.state.sessionLosses >= this.config.maxLoss) {
        this.state.maxLossReached = true
        this.emit("max-loss-reached", { loss: this.state.sessionLosses })
        this.stop()
        return
      }
    }, 3000)
  }

  private executeTrade() {
    // Simulate trade execution
    const isWin = Math.random() > 0.45 // 55% win rate
    const stake = this.calculateStake()
    const payout = stake * 1.95 // Typical Deriv payout
    const profit = isWin ? payout - stake : -stake

    this.state.totalTrades++
    this.state.lastTradeTime = new Date()

    if (isWin) {
      this.state.wins++
      this.state.sessionProfit += profit
    } else {
      this.state.losses++
      this.state.sessionLosses += Math.abs(profit)
      this.state.sessionProfit -= Math.abs(profit)
    }

    this.emit("trade-executed", {
      isWin,
      stake,
      profit,
      totalProfit: this.state.sessionProfit,
      totalTrades: this.state.totalTrades,
    })
  }

  private calculateStake(): number {
    // Martingale logic: increase stake on losses
    const consecutiveLosses = this.state.losses > 0 ? Math.min(this.state.losses, 5) : 0
    return this.config.stake * Math.pow(this.config.martingaleMultiplier, consecutiveLosses)
  }

  getState(): BackgroundTradeState {
    return { ...this.state }
  }

  updateConfig(config: Partial<BackgroundTradeConfig>) {
    this.config = { ...this.config, ...config }
  }
}

// Global instance
let globalService: BackgroundTradingService | null = null

export function getBackgroundTradingService(config?: BackgroundTradeConfig): BackgroundTradingService {
  if (!globalService && config) {
    globalService = new BackgroundTradingService(config)
  }
  return globalService!
}

export function setBackgroundTradingService(service: BackgroundTradingService) {
  globalService = service
}
