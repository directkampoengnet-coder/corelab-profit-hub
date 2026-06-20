import type { DerivAPIClient, ContractUpdate } from "./deriv-api"

interface TradingBotConfig {
  initialStake: number
  martingaleMultiplier: number
  takeProfit: number
  stopLoss: number
  maxConsecutiveLosses: number
  symbol: string
  duration: number
  durationUnit: string
  contractType: string
}

interface TradingBotState {
  currentStake: number
  sessionPL: number
  consecutiveLosses: number
  tradesCount: number
  winsCount: number
  lossesCount: number
}

interface TradeResult {
  isWin: boolean
  profit: number
  buyPrice: number
  sellPrice: number
}

export class TradingBot {
  private api: DerivAPIClient
  private isRunning = false
  private mode: "manual" | "auto" | "speed" = "manual"

  public config: TradingBotConfig = {
    initialStake: 1,
    martingaleMultiplier: 2,
    takeProfit: 50,
    stopLoss: -30,
    maxConsecutiveLosses: 5,
    symbol: "R_100",
    duration: 5,
    durationUnit: "t",
    contractType: "CALL",
  }

  public state: TradingBotState = {
    currentStake: 1,
    sessionPL: 0,
    consecutiveLosses: 0,
    tradesCount: 0,
    winsCount: 0,
    lossesCount: 0,
  }

  public onUpdate: ((state: TradingBotState & { winRate: string }) => void) | null = null
  private currentSubscriptionId: string | null = null

  constructor(derivAPI: DerivAPIClient) {
    this.api = derivAPI
  }

  // Start continuous trading
  async start(mode: "auto" | "speed" = "auto") {
    this.mode = mode
    this.isRunning = true
    this.state.currentStake = this.config.initialStake

    console.log(`[v0] 🚀 Starting ${mode.toUpperCase()} bot`)

    if (mode === "speed") {
      await this.runSpeedBot()
    } else if (mode === "auto") {
      await this.runAutoBot()
    }
  }

  // Stop bot
  stop() {
    this.isRunning = false
    console.log("[v0] ⏹️ Bot stopped")
    this.updateUI()
  }

  // Auto Bot: Continuous trading with analysis
  private async runAutoBot() {
    while (this.isRunning) {
      // Safety checks
      if (this.shouldStop()) {
        this.stop()
        break
      }

      try {
        // Optional: Analyze market here
        const shouldTrade = await this.analyzeMarket()

        if (!shouldTrade) {
          await this.delay(2000)
          continue
        }

        // Execute trade
        console.log(`[v0] 📊 Taking trade - Stake: $${this.state.currentStake}`)
        const result = await this.executeTrade()

        // Process result
        this.handleTradeResult(result)

        // Small delay between trades
        await this.delay(1000)
      } catch (error: any) {
        console.error("[v0] ❌ Trade error:", error)
        this.stop()
        break
      }
    }
  }

  // Speed Bot: Trade every tick
  private async runSpeedBot() {
    let tickSubscriptionId: string | null = null
    let lastTickTime = 0

    try {
      tickSubscriptionId = await this.api.subscribeTicks(this.config.symbol, async (tick) => {
        if (!this.isRunning) return

        // Prevent duplicate trades on same tick
        if (tick.epoch === lastTickTime) return
        lastTickTime = tick.epoch

        // Safety checks
        if (this.shouldStop()) {
          this.stop()
          return
        }

        try {
          console.log(`[v0] ⚡ Speed trade on tick: ${tick.quote}`)
          const result = await this.executeTrade()
          this.handleTradeResult(result)
        } catch (error: any) {
          console.error("[v0] ❌ Speed trade error:", error)
        }
      })
    } catch (error: any) {
      console.error("[v0] ❌ Failed to subscribe to ticks:", error)
      this.stop()
    }
  }

  // Execute single trade
  private async executeTrade(): Promise<TradeResult> {
    const tradeParams: any = {
      symbol: this.config.symbol,
      contract_type: this.config.contractType,
      amount: this.state.currentStake,
      basis: "stake",
      duration: this.config.duration,
      duration_unit: this.config.durationUnit,
      currency: "USD",
    }

    // Get proposal
    const proposal = await this.api.getProposal(tradeParams)
    console.log("[v0] 💵 Proposal price:", proposal.ask_price)

    // Buy contract
    const contract = await this.api.buyContract(proposal.id, proposal.ask_price)
    console.log("[v0] ✅ Contract bought:", contract.contract_id)

    // Monitor until completion
    const result = await this.monitorContract(contract.contract_id)
    console.log("[v0] 📈 Trade completed:", result)

    return {
      isWin: result.profit > 0,
      profit: result.profit,
      buyPrice: result.buy_price,
      sellPrice: result.payout || 0,
    }
  }

  // Monitor contract until completion
  private async monitorContract(contractId: number): Promise<ContractUpdate> {
    return new Promise((resolve, reject) => {
      this.api
        .subscribeProposalOpenContract(contractId, (contract) => {
          if (contract.is_sold) {
            // Unsubscribe when contract is sold
            if (this.currentSubscriptionId) {
              this.api.forget(this.currentSubscriptionId).catch(() => {})
              this.currentSubscriptionId = null
            }
            resolve(contract)
          }
        })
        .then((subscriptionId) => {
          this.currentSubscriptionId = subscriptionId
        })
        .catch(reject)
    })
  }

  // Handle trade result
  private handleTradeResult(result: TradeResult) {
    this.state.tradesCount++

    if (result.isWin) {
      // WIN
      this.state.winsCount++
      this.state.sessionPL += result.profit
      this.state.currentStake = this.config.initialStake // Reset stake
      this.state.consecutiveLosses = 0

      console.log(`[v0] ✅ WIN! Profit: $${result.profit.toFixed(2)}`)
    } else {
      // LOSS
      this.state.lossesCount++
      this.state.sessionPL += result.profit // profit is negative
      this.state.currentStake *= this.config.martingaleMultiplier
      this.state.consecutiveLosses++

      console.log(`[v0] ❌ LOSS! Loss: $${Math.abs(result.profit).toFixed(2)}`)
      console.log(`[v0] 📊 Next stake: $${this.state.currentStake.toFixed(2)}`)
    }

    this.updateUI()
  }

  // Check if should stop
  private shouldStop(): boolean {
    if (this.state.sessionPL >= this.config.takeProfit) {
      console.log("[v0] 🎯 Take Profit reached!")
      return true
    }

    if (this.state.sessionPL <= this.config.stopLoss) {
      console.log("[v0] 🛑 Stop Loss hit!")
      return true
    }

    if (this.state.consecutiveLosses >= this.config.maxConsecutiveLosses) {
      console.log("[v0] ⚠️ Max consecutive losses reached!")
      return true
    }

    return false
  }

  // Analyze market (placeholder)
  private async analyzeMarket(): Promise<boolean> {
    // TODO: Implement analysis logic
    return true
  }

  // Update UI
  private updateUI() {
    if (this.onUpdate) {
      this.onUpdate({
        ...this.state,
        winRate: this.state.tradesCount > 0 ? ((this.state.winsCount / this.state.tradesCount) * 100).toFixed(1) : "0",
      })
    }
  }

  // Delay helper
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // Manual trade
  async manualTrade(tradeConfig?: Partial<TradingBotConfig>): Promise<TradeResult> {
    if (tradeConfig) {
      this.config = { ...this.config, ...tradeConfig }
    }

    try {
      const result = await this.executeTrade()
      this.handleTradeResult(result)
      return result
    } catch (error: any) {
      console.error("[v0] ❌ Manual trade failed:", error)
      throw error
    }
  }

  // Get running status
  getIsRunning(): boolean {
    return this.isRunning
  }

  // Get current mode
  getMode(): string {
    return this.mode
  }
}
