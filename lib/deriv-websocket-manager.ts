"use client"

import { extractLastDigit } from "@/lib/deriv-markets"

const APP_ID = "106629"

type MessageHandler = (message: any) => void

interface TickData {
  quote: number
  lastDigit: number
  epoch: number
  symbol: string
}

interface FastTradeResult {
  success: boolean
  contract_id?: number
  buy_price?: number
  payout?: number
  profit?: number
  error?: string
  execution_time_ms?: number
}

export class DerivWebSocketManager {
  private static instance: DerivWebSocketManager | null = null
  private ws: WebSocket | null = null
  private messageHandlers: Map<string, MessageHandler[]> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 2000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private lastMessageTime = Date.now()
  private messageQueue: any[] = []
  private subscriptions: Map<string, string> = new Map()
  private isConnecting = false
  private pendingRequests: Map<number, { resolve: Function; reject: Function; startTime: number }> = new Map()
  private requestId = 0

  private constructor() {}

  public static getInstance(): DerivWebSocketManager {
    if (!DerivWebSocketManager.instance) {
      DerivWebSocketManager.instance = new DerivWebSocketManager()
    }
    return DerivWebSocketManager.instance
  }

  // Reference: https://developers.deriv.com/docs/websocket
  public async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    if (this.isConnecting) {
      return
    }

    this.isConnecting = true

    return new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        this.isConnecting = false
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          this.ws.close()
        }
        reject(new Error("Connection timeout"))
      }, 10000)

      try {
        const wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=106629`
        console.log("[v0] Connecting to Deriv WebSocket:", wsUrl)

        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout)
          console.log("[v0] WebSocket connected successfully")
          this.reconnectAttempts = 0
          this.isConnecting = false
          this.startHeartbeat()
          this.processMessageQueue()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.lastMessageTime = Date.now()
          try {
            const message = JSON.parse(event.data)
            this.routeMessage(message)
          } catch (error) {
            console.error("[v0] Failed to parse message:", error)
          }
        }

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout)
          console.error("[v0] WebSocket error", error)
          this.isConnecting = false
        }

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout)
          console.log("[v0] WebSocket closed, code:", event.code)
          this.isConnecting = false
          this.stopHeartbeat()
          this.handleReconnect()
        }
      } catch (error) {
        clearTimeout(connectionTimeout)
        this.isConnecting = false
        reject(error)
      }
    })
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts)

    setTimeout(() => {
      this.connect().catch(() => {})
    }, delay)
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    // Send ping every 30 seconds as per Deriv API recommendation
    this.heartbeatInterval = setInterval(() => {
      const timeSinceLastMessage = Date.now() - this.lastMessageTime

      if (timeSinceLastMessage > 30000) {
        this.ws?.close()
        return
      }

      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ ping: 1 })
      }
    }, 30000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift()
      this.ws.send(JSON.stringify(message))
    }
  }

  public send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.messageQueue.push(message)
    }
  }

  public sendAsync<T = any>(message: any, timeoutMs = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      const reqId = ++this.requestId
      const messageWithId = { ...message, req_id: reqId }

      this.pendingRequests.set(reqId, {
        resolve,
        reject,
        startTime: Date.now(),
      })

      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(reqId)) {
          this.pendingRequests.delete(reqId)
          reject(new Error(`Request timeout after ${timeoutMs}ms`))
        }
      }, timeoutMs)

      this.send(messageWithId)
    })
  }

  private routeMessage(message: any) {
    // Handle pong response
    if (message.msg_type === "pong") {
      return
    }

    const reqId = message.req_id
    if (reqId && this.pendingRequests.has(reqId)) {
      const pending = this.pendingRequests.get(reqId)!
      this.pendingRequests.delete(reqId)

      if (message.error) {
        pending.reject(new Error(message.error.message))
      } else {
        pending.resolve(message)
      }
      return
    }

    if (message.error) {
      const handlers = this.messageHandlers.get("error") || []
      handlers.forEach((handler) => handler(message))
      return
    }

    // Route by message type
    const msgType = message.msg_type
    if (msgType) {
      const handlers = this.messageHandlers.get(msgType) || []
      handlers.forEach((handler) => handler(message))
    }
  }

  public on(event: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, [])
    }
    this.messageHandlers.get(event)!.push(handler)
  }

  public off(event: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  // Reference: https://api.deriv.com/api-explorer#ticks
  public async subscribeTicks(symbol: string, callback: (tick: TickData) => void): Promise<string> {
    if (!symbol || typeof symbol !== "string") {
      throw new Error("Invalid symbol for tick subscription")
    }

    const timestamp = Date.now()
    const requestId = `tick_${symbol}_${timestamp}`.substring(0, 50)

    const handler = (message: any) => {
      if (message.tick && message.tick.symbol === symbol) {
        const quote = Number.parseFloat(message.tick.quote)
        const lastDigit = extractLastDigit(quote, symbol)

        callback({
          quote,
          lastDigit,
          epoch: message.tick.epoch,
          symbol: message.tick.symbol,
        })
      }
    }

    this.on("tick", handler)

    this.send({
      ticks: symbol,
      subscribe: 1,
    })

    this.subscriptions.set(requestId, symbol)
    return requestId
  }

  public extractLastDigit(quote: number, symbol = "R_100"): number {
    return extractLastDigit(quote, symbol)
  }

  public async getProposal(params: {
    symbol: string
    contract_type: string
    amount: number
    duration: number
    duration_unit: string
    barrier?: string | number
    basis?: string
    currency?: string
  }): Promise<any> {
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

    const response = await this.sendAsync(request, 5000)
    if (response.error) {
      throw new Error(response.error.message)
    }
    return response.proposal
  }

  public async buyContract(proposalId: string, price?: number): Promise<any> {
    const request: any = { buy: proposalId }
    if (price !== undefined) {
      request.price = price
    }

    const response = await this.sendAsync(request, 5000)
    if (response.error) {
      throw new Error(response.error.message)
    }
    return response.buy
  }

  public async executeFastTrade(params: {
    symbol: string
    contract_type: string
    amount: number
    duration: number
    duration_unit: string
    barrier?: string | number
  }): Promise<FastTradeResult> {
    const startTime = Date.now()

    try {
      // Step 1: Get proposal
      const proposal = await this.getProposal(params)

      // Step 2: Buy immediately
      const buyResult = await this.buyContract(proposal.id, proposal.ask_price)

      return {
        success: true,
        contract_id: buyResult.contract_id,
        buy_price: buyResult.buy_price,
        payout: proposal.payout,
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

  public subscribeToContract(contractId: number, callback: (contract: any) => void): void {
    const handler = (message: any) => {
      if (message.proposal_open_contract && message.proposal_open_contract.contract_id === contractId) {
        callback(message.proposal_open_contract)
      }
    }

    this.on("proposal_open_contract", handler)

    this.send({
      proposal_open_contract: 1,
      contract_id: contractId,
      subscribe: 1,
    })
  }

  public async executeTradeWithResult(params: {
    symbol: string
    contract_type: string
    amount: number
    duration: number
    duration_unit: string
    barrier?: string | number
  }): Promise<FastTradeResult> {
    const startTime = Date.now()

    try {
      // Execute trade
      const tradeResult = await this.executeFastTrade(params)

      if (!tradeResult.success || !tradeResult.contract_id) {
        return tradeResult
      }

      // Wait for settlement
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({
            ...tradeResult,
            error: "Settlement timeout",
          })
        }, 60000)

        this.subscribeToContract(tradeResult.contract_id!, (contract) => {
          if (contract.is_sold || contract.is_expired || contract.status !== "open") {
            clearTimeout(timeout)
            const profit = contract.profit || contract.sell_price - contract.buy_price
            resolve({
              success: profit >= 0,
              contract_id: tradeResult.contract_id,
              buy_price: tradeResult.buy_price,
              payout: contract.payout,
              profit: profit,
              execution_time_ms: Date.now() - startTime,
            })
          }
        })
      })
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        execution_time_ms: Date.now() - startTime,
      }
    }
  }

  // Reference: https://api.deriv.com/api-explorer#sell
  public async sellContract(contractId: number, price?: number): Promise<any> {
    const request: any = { sell: contractId }
    if (price !== undefined) {
      request.price = price
    }

    const response = await this.sendAsync(request, 5000)
    if (response.error) {
      throw new Error(response.error.message)
    }
    return response.sell
  }

  // Reference: https://api.deriv.com/api-explorer#forget
  public async unsubscribe(subscriptionId: string) {
    this.send({ forget: subscriptionId })
    this.subscriptions.delete(subscriptionId)
  }

  // Reference: https://api.deriv.com/api-explorer#forget_all
  public async unsubscribeAll() {
    this.send({ forget_all: ["ticks", "candles", "proposal_open_contract"] })
    this.subscriptions.clear()
  }

  // Reference: https://api.deriv.com/api-explorer#active_symbols
  public async getActiveSymbols(): Promise<
    Array<{ symbol: string; display_name: string; pip: number; exchange_is_open: number }>
  > {
    const response = await this.sendAsync(
      {
        active_symbols: "brief",
        product_type: "basic",
      },
      10000,
    )

    if (response.error) {
      throw new Error(response.error.message)
    }

    return (response.active_symbols || []).map((s: any) => ({
      symbol: s.symbol,
      display_name: s.display_name,
      pip: s.pip,
      exchange_is_open: s.exchange_is_open,
    }))
  }

  // Reference: https://api.deriv.com/api-explorer#authorize
  public async authorize(token: string): Promise<any> {
    const response = await this.sendAsync({ authorize: token }, 10000)
    if (response.error) {
      throw new Error(response.error.message)
    }
    return response.authorize
  }

  // Reference: https://api.deriv.com/api-explorer#balance
  public async getBalance(): Promise<{ balance: number; currency: string }> {
    const response = await this.sendAsync({ balance: 1 }, 5000)
    if (response.error) {
      throw new Error(response.error.message)
    }
    return {
      balance: response.balance.balance,
      currency: response.balance.currency,
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  public disconnect() {
    this.stopHeartbeat()
    this.unsubscribeAll()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.pendingRequests.clear()
  }

  public clearAllHandlers() {
    this.messageHandlers.clear()
    this.pendingRequests.clear()
    this.subscriptions.clear()
  }
}

export const derivWebSocket = DerivWebSocketManager.getInstance()
