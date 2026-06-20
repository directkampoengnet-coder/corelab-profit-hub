import { EventEmitter } from "events"

export interface BackgroundTradeConfig {
  market: string
  stake: number
  targetProfit: number
  maxLoss: number
  maxTrades: number
  strategy: string
}

export class BackgroundTradingManager extends EventEmitter {
  private config: BackgroundTradeConfig
  private isRunning = false
  private totalProfit = 0
  private tradesExecuted = 0
  private storageKey: string

  constructor(config: BackgroundTradeConfig) {
    super()
    this.config = config
    this.storageKey = `bg_trading_${config.market}`
    this.loadState()
  }

  start() {
    this.isRunning = true
    this.saveState()
    this.emit("started")
  }

  stop() {
    this.isRunning = false
    this.saveState()
    this.emit("stopped")
  }

  addTrade(profit: number, isWin: boolean) {
    this.tradesExecuted++
    this.totalProfit += profit

    this.saveState()
    this.emit("trade-added", { profit, isWin, totalProfit: this.totalProfit, tradesExecuted: this.tradesExecuted })

    // Check conditions
    if (this.totalProfit >= this.config.targetProfit) {
      this.emit("target-reached", { totalProfit: this.totalProfit })
      this.stop()
    }

    if (this.totalProfit <= -this.config.maxLoss) {
      this.emit("max-loss-reached", { totalLoss: Math.abs(this.totalProfit) })
      this.stop()
    }

    if (this.tradesExecuted >= this.config.maxTrades) {
      this.emit("max-trades-reached", { totalProfit: this.totalProfit })
      this.stop()
    }
  }

  getState() {
    return {
      isRunning: this.isRunning,
      totalProfit: this.totalProfit,
      tradesExecuted: this.tradesExecuted,
      config: this.config,
    }
  }

  private saveState() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          this.storageKey,
          JSON.stringify({
            isRunning: this.isRunning,
            totalProfit: this.totalProfit,
            tradesExecuted: this.tradesExecuted,
            timestamp: Date.now(),
          }),
        )
      } catch (error) {
        console.error("[v0] Failed to save background trading state:", error)
      }
    }
  }

  private loadState() {
    if (typeof window !== "undefined") {
      try {
        const data = localStorage.getItem(this.storageKey)
        if (data) {
          const state = JSON.parse(data)
          this.isRunning = state.isRunning
          this.totalProfit = state.totalProfit
          this.tradesExecuted = state.tradesExecuted
        }
      } catch (error) {
        console.error("[v0] Failed to load background trading state:", error)
      }
    }
  }

  reset() {
    this.isRunning = false
    this.totalProfit = 0
    this.tradesExecuted = 0
    this.saveState()
  }
}
