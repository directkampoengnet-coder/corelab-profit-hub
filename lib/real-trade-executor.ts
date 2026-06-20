import type { DerivAPIClient, ProposalRequest } from "@/lib/deriv-api"

export interface RealTradeConfig {
  stake: number
  targetProfit: number
  martingaleMultiplier: number
  maxConsecutiveLosses: number
  autoRestart: boolean
  runTimeHours: number
  analysisTimeMinutes: number
  ticksForEntry: number
}

export interface RealTradeState {
  isRunning: boolean
  currentStake: number
  sessionProfit: number
  sessionTrades: number
  consecutiveLosses: number
  hourlyProfit: number
  lastTradeTime: number
  sessionStartTime: number
  totalWins: number
  totalLosses: number
}

export interface ExecutedTrade {
  id: string
  contractId: number
  timestamp: Date
  type: "OVER" | "UNDER"
  digit: number
  stake: number
  payout: number
  profit: number
  result: "WIN" | "LOSS" | "PENDING"
  proposalId?: string
}

export class RealTradeExecutor {
  private state: RealTradeState = {
    isRunning: false,
    currentStake: 0,
    sessionProfit: 0,
    sessionTrades: 0,
    consecutiveLosses: 0,
    hourlyProfit: 0,
    lastTradeTime: 0,
    sessionStartTime: 0,
    totalWins: 0,
    totalLosses: 0,
  }

  private config: RealTradeConfig
  private derivClient: DerivAPIClient
  private executionInterval: NodeJS.Timeout | null = null
  private autoRestartTimeout: NodeJS.Timeout | null = null
  private onTradeExecuted: ((trade: ExecutedTrade) => void) | null = null
  private onStateChanged: ((state: RealTradeState) => void) | null = null
  private onError: ((error: string) => void) | null = null
  private activeContracts = new Map<number, ExecutedTrade>()
  private tradeQueue: Array<{ type: "OVER" | "UNDER"; digit: number; confidence: number }> = []

  constructor(config: RealTradeConfig, derivClient: DerivAPIClient) {
    this.config = config
    this.derivClient = derivClient
    this.state.currentStake = config.stake
  }

  setCallbacks(
    onTradeExecuted: (trade: ExecutedTrade) => void,
    onStateChanged: (state: RealTradeState) => void,
    onError: (error: string) => void,
  ) {
    this.onTradeExecuted = onTradeExecuted
    this.onStateChanged = onStateChanged
    this.onError = onError
  }

  startTrading(): void {
    if (this.state.isRunning) return

    this.state.isRunning = true
    this.state.sessionStartTime = Date.now()
    this.state.sessionProfit = 0
    this.state.sessionTrades = 0
    this.state.consecutiveLosses = 0
    this.state.hourlyProfit = 0
    this.state.currentStake = this.config.stake
    this.state.totalWins = 0
    this.state.totalLosses = 0

    console.log(`[v0] Real trading started with stake: $${this.state.currentStake}`)
    this.notifyStateChange()

    // Start continuous trading loop
    this.executionInterval = setInterval(() => {
      this.processTrades()
    }, 2000) // Check every 2 seconds
  }

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

    console.log(`[v0] Real trading stopped`)
    this.notifyStateChange()
  }

  /**
   * Queue a trade for execution
   */
  queueTrade(type: "OVER" | "UNDER", digit: number, confidence: number): void {
    if (!this.state.isRunning) return

    this.tradeQueue.push({ type, digit, confidence })
    console.log(`[v0] Trade queued: ${type} | Digit: ${digit} | Confidence: ${confidence.toFixed(1)}%`)
  }

  /**
   * Process queued trades and execute them
   */
  private async processTrades(): Promise<void> {
    if (!this.state.isRunning || this.tradeQueue.length === 0) return

    const trade = this.tradeQueue.shift()
    if (!trade) return

    try {
      await this.executeTrade(trade.type, trade.digit, trade.confidence)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`[v0] Trade execution error: ${errorMsg}`)
      if (this.onError) {
        this.onError(errorMsg)
      }
    }
  }

  /**
   * Execute a real trade via Deriv API
   */
  private async executeTrade(type: "OVER" | "UNDER", digit: number, confidence: number): Promise<void> {
    if (!this.derivClient.isConnected()) {
      throw new Error("Deriv API not connected")
    }

    try {
      // Determine contract type based on digit
      const contractType = type === "OVER" ? "DIGITOVER" : "DIGITUNDER"
      const barrier = String(digit)

      // Create proposal request
      const proposalRequest: ProposalRequest = {
        symbol: "R_100", // Default to Volatility 100
        contract_type: contractType,
        amount: this.state.currentStake,
        basis: "stake",
        duration: 5,
        duration_unit: "t", // ticks
        currency: "USD",
        barrier: barrier,
      }

      // Get proposal
      const proposal = await this.derivClient.getProposal(proposalRequest)

      // Buy contract
      const buyResponse = await this.derivClient.buyContract(proposal.id, proposal.ask_price)

      const executedTrade: ExecutedTrade = {
        id: `${Date.now()}-${Math.random()}`,
        contractId: buyResponse.contract_id,
        timestamp: new Date(),
        type,
        digit,
        stake: this.state.currentStake,
        payout: buyResponse.payout,
        profit: 0, // Will be updated when contract closes
        result: "PENDING",
        proposalId: proposal.id,
      }

      this.activeContracts.set(buyResponse.contract_id, executedTrade)

      // Subscribe to contract updates
      await this.derivClient.subscribeProposalOpenContract(buyResponse.contract_id, (contract) => {
        this.handleContractUpdate(buyResponse.contract_id, contract)
      })

      console.log(
        `[v0] Trade executed: ${type} | Digit: ${digit} | Stake: $${this.state.currentStake} | Contract ID: ${buyResponse.contract_id}`,
      )

      this.state.sessionTrades++
      this.state.lastTradeTime = Date.now()
      this.notifyStateChange()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`[v0] Failed to execute trade: ${errorMsg}`)
      throw error
    }
  }

  /**
   * Handle contract updates (when contract closes)
   */
  private handleContractUpdate(contractId: number, contract: any): void {
    const trade = this.activeContracts.get(contractId)
    if (!trade) return

    if (contract.is_sold) {
      // Contract closed
      const profit = contract.profit || 0
      trade.profit = profit
      trade.result = profit > 0 ? "WIN" : profit < 0 ? "LOSS" : "LOSS"

      // Update state
      this.state.sessionProfit += profit
      this.state.hourlyProfit += profit

      if (trade.result === "WIN") {
        this.state.consecutiveLosses = 0
        this.state.currentStake = this.config.stake // Reset to base stake on win
        this.state.totalWins++
      } else {
        this.state.consecutiveLosses++
        this.state.totalLosses++

        // Apply martingale logic
        if (this.state.consecutiveLosses < this.config.maxConsecutiveLosses) {
          this.state.currentStake *= this.config.martingaleMultiplier
        } else {
          // Reset after max consecutive losses
          this.state.consecutiveLosses = 0
          this.state.currentStake = this.config.stake
        }
      }

      console.log(
        `[v0] Contract closed: ${trade.result} | Profit: $${profit.toFixed(2)} | Total: $${this.state.sessionProfit.toFixed(2)}`,
      )

      if (this.onTradeExecuted) {
        this.onTradeExecuted(trade)
      }

      this.notifyStateChange()
      this.activeContracts.delete(contractId)

      // Check if target profit reached
      if (this.state.hourlyProfit >= this.config.targetProfit) {
        this.handleTargetReached()
      }
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
          this.startTrading()
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
  getState(): RealTradeState {
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
    this.activeContracts.clear()
    this.tradeQueue = []
    this.state = {
      isRunning: false,
      currentStake: this.config.stake,
      sessionProfit: 0,
      sessionTrades: 0,
      consecutiveLosses: 0,
      hourlyProfit: 0,
      lastTradeTime: 0,
      sessionStartTime: 0,
      totalWins: 0,
      totalLosses: 0,
    }
    this.notifyStateChange()
  }
}
