import type { DerivAPIClient } from "@/lib/deriv-api"

export interface TradeConfig {
  stake: number
  targetProfit: number
  martingaleMultiplier: number
  maxConsecutiveLosses: number
  autoRestart: boolean
  analysisTimeMinutes: number
  ticksForEntry: number
  market: string
}

export interface TradeState {
  isRunning: boolean
  currentStake: number
  sessionProfit: number
  sessionTrades: number
  consecutiveLosses: number
  totalWins: number
  totalLosses: number
  lastTradeTime: number
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
}

export class DerivTradeManager {
  private state: TradeState = {
    isRunning: false,
    currentStake: 0,
    sessionProfit: 0,
    sessionTrades: 0,
    consecutiveLosses: 0,
    totalWins: 0,
    totalLosses: 0,
    lastTradeTime: 0,
  }

  private config: TradeConfig
  private derivClient: DerivAPIClient
  private executionInterval: NodeJS.Timeout | null = null
  private onTradeExecuted: ((trade: ExecutedTrade) => void) | null = null
  private onStateChanged: ((state: TradeState) => void) | null = null
  private onError: ((error: string) => void) | null = null
  private activeContracts = new Map<number, ExecutedTrade>()
  private tradeQueue: Array<{ type: "OVER" | "UNDER"; digit: number }> = []
  private contractSubscriptions = new Map<number, string>()

  constructor(config: TradeConfig, derivClient: DerivAPIClient) {
    this.config = config
    this.derivClient = derivClient
    this.state.currentStake = config.stake
  }

  setCallbacks(
    onTradeExecuted: (trade: ExecutedTrade) => void,
    onStateChanged: (state: TradeState) => void,
    onError: (error: string) => void,
  ) {
    this.onTradeExecuted = onTradeExecuted
    this.onStateChanged = onStateChanged
    this.onError = onError
  }

  startTrading(): void {
    if (this.state.isRunning) return

    this.state.isRunning = true
    this.state.sessionProfit = 0
    this.state.sessionTrades = 0
    this.state.consecutiveLosses = 0
    this.state.currentStake = this.config.stake
    this.state.totalWins = 0
    this.state.totalLosses = 0

    console.log(`[v0] Trading started with stake: $${this.state.currentStake}`)
    this.notifyStateChange()

    // Start continuous trading loop - check every 3 seconds
    this.executionInterval = setInterval(() => {
      this.processTrades()
    }, 3000)
  }

  stopTrading(): void {
    this.state.isRunning = false

    if (this.executionInterval) {
      clearInterval(this.executionInterval)
      this.executionInterval = null
    }

    // Unsubscribe from all contracts
    this.contractSubscriptions.forEach((subId) => {
      this.derivClient.forget(subId).catch(() => {})
    })
    this.contractSubscriptions.clear()

    console.log(`[v0] Trading stopped`)
    this.notifyStateChange()
  }

  queueTrade(type: "OVER" | "UNDER", digit: number): void {
    if (!this.state.isRunning) return
    this.tradeQueue.push({ type, digit })
    console.log(`[v0] Trade queued: ${type} | Digit: ${digit}`)
  }

  private async processTrades(): Promise<void> {
    if (!this.state.isRunning || this.tradeQueue.length === 0) return

    const trade = this.tradeQueue.shift()
    if (!trade) return

    try {
      await this.executeTrade(trade.type, trade.digit)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`[v0] Trade execution error: ${errorMsg}`)
      if (this.onError) {
        this.onError(errorMsg)
      }
    }
  }

  private async executeTrade(type: "OVER" | "UNDER", digit: number): Promise<void> {
    if (!this.derivClient.isConnected()) {
      throw new Error("Deriv API not connected")
    }

    try {
      const symbolMap: { [key: string]: string } = {
        "Volatility 10 (1s) Index": "R_10",
        "Volatility 25 (1s) Index": "R_25",
        "Volatility 50 (1s) Index": "R_50",
        "Volatility 75 (1s) Index": "R_75",
        "Volatility 100 (1s) Index": "R_100",
        "Volatility 150 (1s) Index": "R_150",
        "Volatility 200 (1s) Index": "R_200",
        "Volatility 250 (1s) Index": "R_250",
        "Volatility 300 (1s) Index": "R_300",
      }

      const symbol = symbolMap[this.config.market] || "R_100"
      const contractType = type === "OVER" ? "DIGITOVER" : "DIGITUNDER"
      const barrier = String(digit)

      console.log(`[v0] Executing trade: ${type} ${digit} on ${symbol}`)

      const proposal = await this.derivClient.getProposal({
        symbol,
        contract_type: contractType,
        amount: this.state.currentStake,
        basis: "stake",
        duration: 5,
        duration_unit: "t",
        currency: "USD",
        barrier,
      })

      console.log(`[v0] Proposal received: ${proposal.id}, Payout: $${proposal.payout}`)

      const buyResponse = await this.derivClient.buyContract(proposal.id, proposal.ask_price)

      console.log(`[v0] Contract bought: ID ${buyResponse.contract_id}, Price: $${buyResponse.buy_price}`)

      const executedTrade: ExecutedTrade = {
        id: `${Date.now()}-${Math.random()}`,
        contractId: buyResponse.contract_id,
        timestamp: new Date(),
        type,
        digit,
        stake: this.state.currentStake,
        payout: buyResponse.payout,
        profit: 0,
        result: "PENDING",
      }

      this.activeContracts.set(buyResponse.contract_id, executedTrade)

      const subId = await this.derivClient.subscribeProposalOpenContract(buyResponse.contract_id, (contract) => {
        this.handleContractUpdate(buyResponse.contract_id, contract)
      })

      this.contractSubscriptions.set(buyResponse.contract_id, subId)

      this.state.sessionTrades++
      this.state.lastTradeTime = Date.now()
      this.notifyStateChange()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`[v0] Failed to execute trade: ${errorMsg}`)
      throw error
    }
  }

  private handleContractUpdate(contractId: number, contract: any): void {
    const trade = this.activeContracts.get(contractId)
    if (!trade) return

    if (contract.is_sold) {
      const profit = contract.profit || 0
      trade.profit = profit
      trade.result = profit > 0 ? "WIN" : "LOSS"

      this.state.sessionProfit += profit

      if (trade.result === "WIN") {
        this.state.consecutiveLosses = 0
        this.state.currentStake = this.config.stake
        this.state.totalWins++
      } else {
        this.state.consecutiveLosses++
        this.state.totalLosses++

        if (this.state.consecutiveLosses < this.config.maxConsecutiveLosses) {
          this.state.currentStake = Math.round(this.state.currentStake * this.config.martingaleMultiplier * 100) / 100
        } else {
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

      // Unsubscribe from this contract
      const subId = this.contractSubscriptions.get(contractId)
      if (subId) {
        this.derivClient.forget(subId).catch(() => {})
        this.contractSubscriptions.delete(contractId)
      }

      if (this.state.sessionProfit >= this.config.targetProfit) {
        this.handleTargetReached()
      }
    }
  }

  private handleTargetReached(): void {
    console.log(`[v0] Target profit reached: $${this.state.sessionProfit.toFixed(2)}`)
    this.stopTrading()
  }

  getState(): TradeState {
    return { ...this.state }
  }

  private notifyStateChange(): void {
    if (this.onStateChanged) {
      this.onStateChanged({ ...this.state })
    }
  }

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
      totalWins: 0,
      totalLosses: 0,
      lastTradeTime: 0,
    }
    this.notifyStateChange()
  }
}
