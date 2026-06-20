// Contract types per Deriv API documentation
// Reference: https://api.deriv.com/api-explorer#proposal
export const DERIV_CONTRACT_TYPES = {
  // Digit contracts (require barrier for some)
  DIGITDIFF: "DIGITDIFF", // Last digit differs from prediction
  DIGITMATCH: "DIGITMATCH", // Last digit matches prediction
  DIGITOVER: "DIGITOVER", // Last digit is over prediction
  DIGITUNDER: "DIGITUNDER", // Last digit is under prediction
  DIGITODD: "DIGITODD", // Last digit is odd
  DIGITEVEN: "DIGITEVEN", // Last digit is even
  // Rise/Fall contracts
  CALL: "CALL", // Rise
  PUT: "PUT", // Fall
  // Touch/No Touch
  ONETOUCH: "ONETOUCH",
  NOTOUCH: "NOTOUCH",
  // Higher/Lower
  HIGHER: "HIGHER",
  LOWER: "LOWER",
  // Multipliers
  MULTUP: "MULTUP",
  MULTDOWN: "MULTDOWN",
} as const

// Duration units per Deriv API
// Reference: https://api.deriv.com/api-explorer#trading_durations
export const DERIV_DURATION_UNITS = {
  TICKS: "t",
  SECONDS: "s",
  MINUTES: "m",
  HOURS: "h",
  DAYS: "d",
} as const

// Basis types per Deriv API
export const DERIV_BASIS_TYPES = {
  STAKE: "stake",
  PAYOUT: "payout",
} as const

// Check if contract type requires barrier
export function requiresBarrier(contractType: string): boolean {
  return ["DIGITDIFF", "DIGITMATCH", "DIGITOVER", "DIGITUNDER"].includes(contractType)
}

// Proposal request interface per Deriv API spec
export interface ProposalRequest {
  symbol: string
  contract_type: string
  amount: number
  basis?: string
  duration: number
  duration_unit: string
  currency?: string
  barrier?: string | number
}

export interface ProposalResponse {
  id: string
  ask_price: number
  payout: number
  spot: number
  spot_time: number
  date_start: number
  date_expiry: number
  longcode: string
}

export interface BuyResponse {
  contract_id: number
  buy_price: number
  balance_after: number
  payout: number
  start_time: number
  transaction_id: number
  longcode: string
  shortcode: string
}

export interface TickData {
  symbol: string
  quote: number
  epoch: number
  pip_size: number
}

interface DerivAPIClientOptions {
  appId?: string | number
  token?: string
  endpoint?: string
}

/**
 * Deriv API Client
 * Implements all trading and market data APIs
 */
export class DerivAPIClient {
  private ws: WebSocket | null = null
  private requestId = 0
  private pendingRequests: Map<number, { resolve: Function; reject: Function }> = new Map()
  private subscriptions: Map<string, Function> = new Map()
  private _isAuthorized = false
  private authToken: string | null = null
  private _appId = "106629"
  private endpoint = "wss://ws.derivws.com/websockets/v3"
  private errorCallback: ((error: Error) => void) | null = null
  private _isConnected = false
  private pingInterval: NodeJS.Timeout | null = null

  constructor(options?: DerivAPIClientOptions | string, endpoint?: string) {
    if (typeof options === "object" && options !== null) {
      this._appId = options.appId ? String(options.appId) : "106629"
      this.endpoint = options.endpoint || "wss://ws.derivws.com/websockets/v3"
      this.authToken = options.token || null
    } else if (typeof options === "string") {
      this._appId = options || "106629"
      this.endpoint = endpoint || "wss://ws.derivws.com/websockets/v3"
    }
    console.log("[v0] DerivAPIClient initialized with app_id:", this._appId)
  }

  setErrorCallback(callback: (error: Error) => void): void {
    this.errorCallback = callback
  }

  private emitError(error: Error): void {
    if (this.errorCallback) {
      this.errorCallback(error)
    }
  }

  private startPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
    }
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ ping: 1 }))
      }
    }, 30000)
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  /**
   * Connect to Deriv WebSocket API
   * Reference: https://developers.deriv.com/docs/websocket
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${this.endpoint}?app_id=106629`
      console.log("[v0] Connecting to:", url)
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        console.log("[v0] WebSocket connected successfully")
        this._isConnected = true
        this.startPingInterval()
        resolve()
      }
      this.ws.onerror = (error) => {
        console.error("[v0] WebSocket connection error:", error)
        this._isConnected = false
        this.stopPingInterval()
        this.emitError(new Error("WebSocket connection error"))
        reject(error)
      }
      this.ws.onclose = () => {
        console.log("[v0] WebSocket closed")
        this._isConnected = false
        this._isAuthorized = false
        this.stopPingInterval()
      }
      this.ws.onmessage = (event) => this.handleMessage(event)
    })
  }

  /**
   * Authorize with OAuth token
   * Reference: https://api.deriv.com/api-explorer#authorize
   */
  async authorize(token: string): Promise<any> {
    this.authToken = token
    const response = await this.send({ authorize: token })
    if (response.authorize) {
      this._isAuthorized = true
    }
    return response.authorize
  }

  /**
   * Send request to Deriv API
   */
  send(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        const error = new Error("WebSocket not connected")
        this.emitError(error)
        reject(error)
        return
      }

      const reqId = ++this.requestId
      this.pendingRequests.set(reqId, { resolve, reject })

      this.ws.send(JSON.stringify({ ...request, req_id: reqId }))

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(reqId)) {
          this.pendingRequests.delete(reqId)
          const error = new Error("Request timeout")
          this.emitError(error)
          reject(error)
        }
      }, 10000)
    })
  }

  private handleMessage(event: MessageEvent) {
    const data = JSON.parse(event.data)
    const reqId = data.req_id

    if (data.msg_type === "ping") {
      return
    }

    // Handle pending request responses
    if (reqId && this.pendingRequests.has(reqId)) {
      const { resolve, reject } = this.pendingRequests.get(reqId)!
      this.pendingRequests.delete(reqId)

      if (data.error) {
        const error = new Error(data.error.message)
        this.emitError(error)
        reject(error)
      } else {
        resolve(data)
      }
      return
    }

    // Handle subscription updates
    if (data.tick) {
      const callback = this.subscriptions.get(`tick_${data.tick.symbol}`)
      if (callback) callback(data.tick)
    }

    if (data.proposal_open_contract) {
      const contractId = data.proposal_open_contract.contract_id
      const callback = this.subscriptions.get(`contract_${contractId}`)
      if (callback) callback(data.proposal_open_contract)
    }

    // Handle errors without req_id
    if (data.error && !reqId) {
      this.emitError(new Error(data.error.message))
    }
  }

  /**
   * Get active symbols
   * Reference: https://api.deriv.com/api-explorer#active_symbols
   */
  async getActiveSymbols(productType = "basic"): Promise<any[]> {
    const response = await this.send({
      active_symbols: "brief",
      product_type: productType,
    })
    return response.active_symbols || []
  }

  /**
   * Subscribe to tick stream
   * Reference: https://api.deriv.com/api-explorer#ticks
   */
  async subscribeTicks(symbol: string, callback: (tick: TickData) => void): Promise<string> {
    this.subscriptions.set(`tick_${symbol}`, callback)
    const response = await this.send({
      ticks: symbol,
      subscribe: 1,
    })
    return response.subscription?.id || ""
  }

  /**
   * Get price proposal
   * Reference: https://api.deriv.com/api-explorer#proposal
   */
  async getProposal(params: ProposalRequest): Promise<ProposalResponse> {
    const request: any = {
      proposal: 1,
      symbol: params.symbol,
      contract_type: params.contract_type,
      amount: params.amount,
      basis: params.basis || DERIV_BASIS_TYPES.STAKE,
      duration: params.duration,
      duration_unit: params.duration_unit,
      currency: params.currency || "USD",
    }

    // Add barrier for contracts that require it
    if (requiresBarrier(params.contract_type)) {
      if (params.barrier === undefined || params.barrier === null) {
        throw new Error(`Missing required barrier for ${params.contract_type}`)
      }
      request.barrier = String(params.barrier)
    }

    const response = await this.send(request)
    return response.proposal
  }

  /**
   * Buy contract
   * Reference: https://api.deriv.com/api-explorer#buy
   */
  async buyContract(proposalId: string, price?: number): Promise<BuyResponse> {
    const request: any = { buy: proposalId }
    if (price !== undefined) {
      request.price = price
    }
    const response = await this.send(request)
    return response.buy
  }

  /**
   * Sell contract
   * Reference: https://api.deriv.com/api-explorer#sell
   */
  async sellContract(contractId: number, price?: number): Promise<any> {
    const request: any = { sell: contractId }
    if (price !== undefined) {
      request.price = price
    }
    const response = await this.send(request)
    return response.sell
  }

  /**
   * Subscribe to contract updates
   * Reference: https://api.deriv.com/api-explorer#proposal_open_contract
   */
  async subscribeToContract(contractId: number, callback: (contract: any) => void): Promise<string> {
    this.subscriptions.set(`contract_${contractId}`, callback)
    const response = await this.send({
      proposal_open_contract: 1,
      contract_id: contractId,
      subscribe: 1,
    })
    return response.subscription?.id || ""
  }

  /**
   * Get account balance
   * Reference: https://api.deriv.com/api-explorer#balance
   */
  async getBalance(): Promise<{ balance: number; currency: string }> {
    const response = await this.send({ balance: 1 })
    return {
      balance: response.balance.balance,
      currency: response.balance.currency,
    }
  }

  /**
   * Get profit table
   * Reference: https://api.deriv.com/api-explorer#profit_table
   */
  async getProfitTable(limit = 50): Promise<any[]> {
    const response = await this.send({
      profit_table: 1,
      limit,
      sort: "DESC",
    })
    return response.profit_table?.transactions || []
  }

  /**
   * Get portfolio
   * Reference: https://api.deriv.com/api-explorer#portfolio
   */
  async getPortfolio(): Promise<any[]> {
    const response = await this.send({ portfolio: 1 })
    return response.portfolio?.contracts || []
  }

  /**
   * Get tick history
   * Reference: https://api.deriv.com/api-explorer#ticks_history
   */
  async getTickHistory(symbol: string, count = 100): Promise<{ prices: number[]; times: number[] }> {
    const response = await this.send({
      ticks_history: symbol,
      count: count,
      end: "latest",
      style: "ticks",
    })

    if (!response.history) {
      throw new Error("No history data received")
    }

    return {
      prices: response.history.prices || [],
      times: response.history.times || [],
    }
  }

  /**
   * Forget subscription
   * Reference: https://api.deriv.com/api-explorer#forget
   */
  async forget(subscriptionId: string): Promise<void> {
    if (!subscriptionId) return
    try {
      await this.send({ forget: subscriptionId })
    } catch (error) {
      // Ignore errors when forgetting - subscription might already be gone
      console.log("[v0] Forget subscription info:", error)
    }
  }

  /**
   * Forget subscription (alias for forget)
   */
  async forgetSubscription(subscriptionId: string): Promise<void> {
    return this.forget(subscriptionId)
  }

  /**
   * Forget all subscriptions of a type
   * Reference: https://api.deriv.com/api-explorer#forget_all
   */
  async forgetAll(...streamTypes: string[]): Promise<void> {
    for (const streamType of streamTypes) {
      try {
        await this.send({ forget_all: streamType })
      } catch (error) {
        // Ignore errors when forgetting all
        console.log("[v0] ForgetAll info:", error)
      }
    }
  }

  /**
   * Get contracts for symbol
   * Reference: https://api.deriv.com/api-explorer#contracts_for
   */
  async getContractsFor(symbol: string): Promise<any[]> {
    const response = await this.send({
      contracts_for: symbol,
      product_type: "basic",
    })
    return response.contracts_for?.available || []
  }

  /**
   * Disconnect from API
   */
  disconnect(): void {
    this.stopPingInterval()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.pendingRequests.clear()
    this.subscriptions.clear()
    this._isAuthorized = false
    this._isConnected = false
  }

  isConnected(): boolean {
    return this._isConnected && this.ws?.readyState === WebSocket.OPEN
  }

  isAuth(): boolean {
    return this._isAuthorized
  }

  get connected(): boolean {
    return this._isConnected && this.ws?.readyState === WebSocket.OPEN
  }

  get authorized(): boolean {
    return this._isAuthorized
  }
}
