/**
 * Deriv Fast Trade Execution Engine
 * Reference: https://developers.deriv.com/docs/trading-apis
 *
 * Implements instant trade execution without delays using:
 * - Direct WebSocket calls for minimum latency
 * - Parallel proposal/buy flow
 * - No polling - uses subscriptions for real-time updates
 */

import { extractLastDigit } from "./deriv-markets"

// Contract types per Deriv API documentation
// Reference: https://api.deriv.com/api-explorer#proposal
export const DERIV_CONTRACT_TYPES = {
  DIGITDIFF: "DIGITDIFF",
  DIGITMATCH: "DIGITMATCH",
  DIGITOVER: "DIGITOVER",
  DIGITUNDER: "DIGITUNDER",
  DIGITODD: "DIGITODD",
  DIGITEVEN: "DIGITEVEN",
  CALL: "CALL",
  PUT: "PUT",
  ONETOUCH: "ONETOUCH",
  NOTOUCH: "NOTOUCH",
  HIGHER: "HIGHER",
  LOWER: "LOWER",
} as const

export const DERIV_DURATION_UNITS = {
  TICKS: "t",
  SECONDS: "s",
  MINUTES: "m",
  HOURS: "h",
  DAYS: "d",
} as const

export const DERIV_BASIS = {
  STAKE: "stake",
  PAYOUT: "payout",
} as const

export interface FastTradeParams {
  symbol: string
  contract_type: string
  amount: number
  duration: number
  duration_unit: string
  barrier?: number | string
  basis?: string
  currency?: string
}

export interface TradeResult {
  success: boolean
  contract_id?: number
  buy_price?: number
  payout?: number
  profit?: number
  entry_spot?: number
  exit_spot?: number
  entry_digit?: number
  exit_digit?: number
  error?: string
  execution_time_ms?: number
}

export interface ContinuousTradingConfig {
  symbol: string
  contract_type: string
  initial_stake: number
  duration: number
  duration_unit: string
  barrier?: number
  take_profit: number
  stop_loss: number
  martingale_multiplier: number
  max_stake: number
  auto_restart: boolean
  restart_delay_ms: number
}

/**
 * Fast Trade Engine with continuous trading support
 */
export class DerivFastTradeEngine {
  private ws: WebSocket | null = null
  private appId: string
  private pendingRequests: Map<number, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map()
  private contractCallbacks: Map<number, (contract: any) => void> = new Map()
  private tickCallbacks: Map<string, (tick: any) => void> = new Map()
  private requestId = 0
  private isConnected = false
  private authToken: string | null = null

  // Continuous trading state
  private isTradingActive = false
  private currentStake = 0
  private totalProfit = 0
  private config: ContinuousTradingConfig | null = null
  private onTradeResult: ((result: TradeResult) => void) | null = null
  private onStatusChange: ((status: string) => void) | null = null

  constructor(appId = "106629") {
    this.appId = appId
  }

  /**
   * Connect to Deriv WebSocket API
   * Reference: https://developers.deriv.com/docs/websocket
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Connection timeout")), 10000)

      this.ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`)

      this.ws.onopen = () => {
        clearTimeout(timeout)
        this.isConnected = true
        resolve()
      }

      this.ws.onerror = (error) => {
        clearTimeout(timeout)
        reject(error)
      }

      this.ws.onmessage = (event) => this.handleMessage(JSON.parse(event.data))

      this.ws.onclose = () => {
        this.isConnected = false
      }
    })
  }

  /**
   * Authorize with OAuth token
   * Reference: https://api.deriv.com/api-explorer#authorize
   */
  async authorize(token: string): Promise<any> {
    this.authToken = token
    const response = await this.sendRequest({ authorize: token })
    return response.authorize
  }

  /**
   * Send request and wait for response
   */
  private sendRequest(request: any, timeoutMs = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket not connected"))
        return
      }

      const reqId = ++this.requestId
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(reqId)
        reject(new Error(`Request timeout after ${timeoutMs}ms`))
      }, timeoutMs)

      this.pendingRequests.set(reqId, { resolve, reject, timeout })
      this.ws.send(JSON.stringify({ ...request, req_id: reqId }))
    })
  }

  private handleMessage(data: any) {
    // Handle request responses
    const reqId = data.req_id
    if (reqId && this.pendingRequests.has(reqId)) {
      const { resolve, reject, timeout } = this.pendingRequests.get(reqId)!
      clearTimeout(timeout)
      this.pendingRequests.delete(reqId)

      if (data.error) {
        reject(new Error(data.error.message))
      } else {
        resolve(data)
      }
      return
    }

    // Handle tick subscriptions
    if (data.tick) {
      const callback = this.tickCallbacks.get(data.tick.symbol)
      if (callback) callback(data.tick)
    }

    // Handle contract updates
    if (data.proposal_open_contract) {
      const contract = data.proposal_open_contract
      const callback = this.contractCallbacks.get(contract.contract_id)
      if (callback) callback(contract)
    }
  }

  /**
   * Subscribe to ticks for a symbol
   * Reference: https://api.deriv.com/api-explorer#ticks
   */
  async subscribeTicks(symbol: string, callback: (tick: any) => void): Promise<string> {
    this.tickCallbacks.set(symbol, callback)
    const response = await this.sendRequest({ ticks: symbol, subscribe: 1 })
    return response.subscription?.id || ""
  }

  /**
   * Get proposal with payout info
   * Reference: https://api.deriv.com/api-explorer#proposal
   */
  async getProposal(params: FastTradeParams): Promise<any> {
    const request: any = {
      proposal: 1,
      symbol: params.symbol,
      contract_type: params.contract_type,
      amount: params.amount,
      basis: params.basis || "stake",
      duration: params.duration,
      duration_unit: params.duration_unit,
      currency: params.currency || "USD",
    }

    // Add barrier for digit contracts that require it
    if (["DIGITDIFF", "DIGITMATCH", "DIGITOVER", "DIGITUNDER"].includes(params.contract_type)) {
      if (params.barrier !== undefined && params.barrier !== null) {
        request.barrier = String(params.barrier)
      }
    }

    const response = await this.sendRequest(request)
    return response.proposal
  }

  /**
   * Buy contract immediately
   * Reference: https://api.deriv.com/api-explorer#buy
   */
  async buyContract(proposalId: string, price?: number): Promise<any> {
    const request: any = { buy: proposalId }
    if (price !== undefined) {
      request.price = price
    }
    const response = await this.sendRequest(request)
    return response.buy
  }

  /**
   * Execute trade with FASTEST possible execution
   * Combines proposal + buy in immediate sequence
   */
  async executeFastTrade(params: FastTradeParams): Promise<TradeResult> {
    const startTime = Date.now()

    try {
      // Step 1: Get proposal (contains payout info)
      const proposal = await this.getProposal(params)

      // Step 2: Buy immediately using proposal ID
      const buy = await this.buyContract(proposal.id, proposal.ask_price)

      // Step 3: Wait for settlement via subscription
      const result = await this.waitForSettlement(buy.contract_id, proposal.payout, buy.buy_price)

      return {
        ...result,
        execution_time_ms: Date.now() - startTime,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        execution_time_ms: Date.now() - startTime,
      }
    }
  }

  /**
   * Wait for contract settlement using subscription
   * Reference: https://api.deriv.com/api-explorer#proposal_open_contract
   */
  private waitForSettlement(contractId: number, expectedPayout: number, buyPrice: number): Promise<TradeResult> {
    return new Promise((resolve) => {
      // Set timeout for tick contracts (max 10 seconds)
      const timeout = setTimeout(() => {
        this.contractCallbacks.delete(contractId)
        resolve({
          success: false,
          contract_id: contractId,
          buy_price: buyPrice,
          payout: expectedPayout,
          error: "Settlement timeout",
        })
      }, 10000)

      // Subscribe to contract updates
      this.contractCallbacks.set(contractId, (contract) => {
        // Check if contract is settled
        if (contract.is_sold || contract.is_expired || contract.status !== "open") {
          clearTimeout(timeout)
          this.contractCallbacks.delete(contractId)

          const profit = contract.profit || contract.sell_price - contract.buy_price
          const isWin = profit > 0

          resolve({
            success: isWin,
            contract_id: contractId,
            buy_price: contract.buy_price,
            payout: contract.payout || expectedPayout,
            profit: profit,
            entry_spot: contract.entry_spot,
            exit_spot: contract.exit_spot,
            entry_digit: contract.entry_spot ? extractLastDigit(contract.entry_spot, contract.underlying) : undefined,
            exit_digit: contract.exit_spot ? extractLastDigit(contract.exit_spot, contract.underlying) : undefined,
          })

          // Forget subscription
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ forget_all: "proposal_open_contract" }))
          }
        }
      })

      // Send subscription request
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            proposal_open_contract: 1,
            contract_id: contractId,
            subscribe: 1,
          }),
        )
      }
    })
  }

  /**
   * Start continuous trading with auto-restart
   */
  startContinuousTrading(
    config: ContinuousTradingConfig,
    onResult: (result: TradeResult) => void,
    onStatus: (status: string) => void,
  ): void {
    this.config = config
    this.onTradeResult = onResult
    this.onStatusChange = onStatus
    this.currentStake = config.initial_stake
    this.totalProfit = 0
    this.isTradingActive = true

    this.onStatusChange?.("Starting continuous trading...")
    this.executeContinuousTrade()
  }

  /**
   * Execute single trade in continuous loop
   */
  private async executeContinuousTrade(): Promise<void> {
    if (!this.isTradingActive || !this.config) return

    this.onStatusChange?.(`Executing trade... Stake: $${this.currentStake.toFixed(2)}`)

    const result = await this.executeFastTrade({
      symbol: this.config.symbol,
      contract_type: this.config.contract_type,
      amount: this.currentStake,
      duration: this.config.duration,
      duration_unit: this.config.duration_unit,
      barrier: this.config.barrier,
    })

    // Update totals
    if (result.profit !== undefined) {
      this.totalProfit += result.profit
    }

    // Notify result
    this.onTradeResult?.(result)

    // Check TP/SL
    if (this.totalProfit >= this.config.take_profit) {
      this.onStatusChange?.(`Take Profit reached: +$${this.totalProfit.toFixed(2)}`)
      this.handleTPSLReached("tp")
      return
    }

    if (this.totalProfit <= -this.config.stop_loss) {
      this.onStatusChange?.(`Stop Loss reached: -$${Math.abs(this.totalProfit).toFixed(2)}`)
      this.handleTPSLReached("sl")
      return
    }

    // Apply Martingale
    if (result.success) {
      this.currentStake = this.config.initial_stake
    } else {
      this.currentStake = Math.min(this.currentStake * this.config.martingale_multiplier, this.config.max_stake)
    }

    // Continue trading immediately (no delay for speed)
    if (this.isTradingActive) {
      // Use setImmediate for fastest possible continuation
      setImmediate(() => this.executeContinuousTrade())
    }
  }

  /**
   * Handle TP/SL reached - auto restart if configured
   */
  private handleTPSLReached(type: "tp" | "sl"): void {
    if (this.config?.auto_restart) {
      this.onStatusChange?.(`${type.toUpperCase()} reached. Restarting in ${this.config.restart_delay_ms}ms...`)

      // Reset state
      this.currentStake = this.config.initial_stake
      this.totalProfit = 0

      // Restart after delay
      setTimeout(() => {
        if (this.isTradingActive && this.config) {
          this.onStatusChange?.("Restarting continuous trading...")
          this.executeContinuousTrade()
        }
      }, this.config.restart_delay_ms)
    } else {
      this.stopContinuousTrading()
    }
  }

  /**
   * Stop continuous trading
   */
  stopContinuousTrading(): void {
    this.isTradingActive = false
    this.onStatusChange?.("Trading stopped")
  }

  /**
   * Get current trading stats
   */
  getTradingStats(): { totalProfit: number; currentStake: number; isActive: boolean } {
    return {
      totalProfit: this.totalProfit,
      currentStake: this.currentStake,
      isActive: this.isTradingActive,
    }
  }

  /**
   * Get balance
   * Reference: https://api.deriv.com/api-explorer#balance
   */
  async getBalance(): Promise<{ balance: number; currency: string }> {
    const response = await this.sendRequest({ balance: 1 })
    return {
      balance: response.balance.balance,
      currency: response.balance.currency,
    }
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    this.isTradingActive = false
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.pendingRequests.clear()
    this.contractCallbacks.clear()
    this.tickCallbacks.clear()
  }

  get connected(): boolean {
    return this.isConnected
  }
}

/**
 * Helper to create trade parameters
 */
export const TradeParams = {
  digitEven: (symbol: string, stake: number, ticks = 1): FastTradeParams => ({
    symbol,
    contract_type: "DIGITEVEN",
    amount: stake,
    duration: ticks,
    duration_unit: "t",
  }),

  digitOdd: (symbol: string, stake: number, ticks = 1): FastTradeParams => ({
    symbol,
    contract_type: "DIGITODD",
    amount: stake,
    duration: ticks,
    duration_unit: "t",
  }),

  digitOver: (symbol: string, stake: number, barrier: number, ticks = 1): FastTradeParams => ({
    symbol,
    contract_type: "DIGITOVER",
    amount: stake,
    duration: ticks,
    duration_unit: "t",
    barrier,
  }),

  digitUnder: (symbol: string, stake: number, barrier: number, ticks = 1): FastTradeParams => ({
    symbol,
    contract_type: "DIGITUNDER",
    amount: stake,
    duration: ticks,
    duration_unit: "t",
    barrier,
  }),

  digitMatch: (symbol: string, stake: number, barrier: number, ticks = 1): FastTradeParams => ({
    symbol,
    contract_type: "DIGITMATCH",
    amount: stake,
    duration: ticks,
    duration_unit: "t",
    barrier,
  }),

  digitDiff: (symbol: string, stake: number, barrier: number, ticks = 1): FastTradeParams => ({
    symbol,
    contract_type: "DIGITDIFF",
    amount: stake,
    duration: ticks,
    duration_unit: "t",
    barrier,
  }),
}
