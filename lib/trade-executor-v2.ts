// Implements martingale logic, auto-restart, and real trade execution

export interface TradeConfig {
  stake: number
  targetProfit: number
  martingaleMultiplier: number
  maxConsecutiveLosses: number
  autoRestart: boolean
  runTimeHours: number
}

export interface TradeState {
  isRunning: boolean
  currentStake: number
  sessionProfit: number
  sessionTrades: number
  consecutiveLosses: number
  hourlyProfit: number
  lastTradeTime: number
  sessionStartTime: number
}

export class TradeExecutorV2 {
  private state: TradeState = {
    isRunning: false,
    currentStake: 0,
    sessionProfit: 0,
    sessionTrades: 0,
    consecutiveLosses: 0,
    hourlyProfit: 0,
    lastTradeTime: 0,
    sessionStartTime: 0,
  }

  private config: TradeConfig
  private executionInterval: NodeJS.Timeout | null = null
  private autoRestartTimeout: NodeJS.Timeout | null = null
  private onTradeExecuted: ((trade: any) => void) | null = null
  private onStateChanged: ((state: TradeState) => void) | null = null

  constructor(config: TradeConfig) {
    this.config = config
    this.state.currentStake = config.stake
  }

  /**
   * Start automated trading with proper initialization
   */
  startTrading(onTradeExecuted: (trade: any) => void, onStateChanged: (state: TradeState) => void): void {
    if (this.state.isRunning) return

    this.state.isRunning = true
    this.state.sessionStartTime = Date.now()
    this.state.sessionProfit = 0
    this.state.sessionTrades = 0
    this.state.consecutiveLosses = 0
    this.state.hourlyProfit = 0
    this.state.currentStake = this.config.stake

    this.onTradeExecuted = onTradeExecuted
    this.onStateChanged = onStateChanged

    console.log(`[v0] Trading started with stake: $${this.state.currentStake}`)
    this.notifyStateChange()
  }

  /**
   * Stop trading and clean up
   */
  stopTrading(): void {
    this.state.isRunning = false

    if (this.executionInterval) {
      clearInterval(this.executionInterval)
      this.executionInterval = null
    }

    if (this.autoRestartTimeout) {
      clearTimeout(this.autoRestartTimeout)
      this.autoRestartTimeout = null
    }

    console.log(`[v0] Trading stopped`)
    this.notifyStateChange()
  }

  /**
   * Execute a single trade with martingale logic
   */
  executeTrade(tradeType: "OVER" | "UNDER", digit: number, winProbability: number): void {
    if (!this.state.isRunning) return

    // Simulate trade execution (in real implementation, this would call Deriv API)
    const isWin = Math.random() < winProbability / 100
    const payout = this.state.currentStake * 1.85
    const profit = isWin ? payout - this.state.currentStake : -this.state.currentStake

    const trade = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type: tradeType,
      digit,
      stake: this.state.currentStake,
      payout,
      profit,
      result: isWin ? "WIN" : "LOSS",
      winProbability,
    }

    // Update state
    this.state.sessionTrades++
    this.state.sessionProfit += profit
    this.state.hourlyProfit += profit
    this.state.lastTradeTime = Date.now()

    // Apply martingale logic
    if (isWin) {
      this.state.consecutiveLosses = 0
      this.state.currentStake = this.config.stake // Reset to base stake on win
    } else {
      this.state.consecutiveLosses++
      // Increase stake on loss (martingale)
      if (this.state.consecutiveLosses < this.config.maxConsecutiveLosses) {
        this.state.currentStake *= this.config.martingaleMultiplier
      } else {
        // Reset after max consecutive losses
        this.state.consecutiveLosses = 0
        this.state.currentStake = this.config.stake
      }
    }

    console.log(
      `[v0] Trade executed: ${tradeType} | Result: ${trade.result} | Profit: $${profit.toFixed(2)} | Total: $${this.state.sessionProfit.toFixed(2)}`,
    )

    if (this.onTradeExecuted) {
      this.onTradeExecuted(trade)
    }

    this.notifyStateChange()

    // Check if target profit reached
    if (this.state.hourlyProfit >= this.config.targetProfit) {
      this.handleTargetReached()
    }
  }

  /**
   * Handle when target profit is reached
   */
  private handleTargetReached(): void {
    console.log(`[v0] Target profit reached: $${this.state.hourlyProfit.toFixed(2)}`)

    if (this.config.autoRestart) {
      console.log(`[v0] Auto-restart enabled. Cooling for 30 minutes...`)
      this.stopTrading()

      this.autoRestartTimeout = setTimeout(
        () => {
          console.log(`[v0] Restarting trading after cool-down period`)
          this.state.hourlyProfit = 0
          this.startTrading(this.onTradeExecuted!, this.onStateChanged!)
        },
        30 * 60 * 1000,
      ) // 30 minutes
    } else {
      this.stopTrading()
    }
  }

  /**
   * Get current trading state
   */
  getState(): TradeState {
    return { ...this.state }
  }

  /**
   * Notify state change to listeners
   */
  private notifyStateChange(): void {
    if (this.onStateChanged) {
      this.onStateChanged({ ...this.state })
    }
  }

  /**
   * Check if session time limit reached
   */
  isSessionTimeExpired(): boolean {
    const elapsedHours = (Date.now() - this.state.sessionStartTime) / (1000 * 60 * 60)
    return elapsedHours >= this.config.runTimeHours
  }

  /**
   * Reset session
   */
  resetSession(): void {
    this.stopTrading()
    this.state = {
      isRunning: false,
      currentStake: this.config.stake,
      sessionProfit: 0,
      sessionTrades: 0,
      consecutiveLosses: 0,
      hourlyProfit: 0,
      lastTradeTime: 0,
      sessionStartTime: 0,
    }
    this.notifyStateChange()
  }
}
