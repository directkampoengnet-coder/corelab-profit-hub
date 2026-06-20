export class DerivWS {
  private ws: WebSocket | null = null
  private appId: string
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 2000
  private messageHandlers: Map<string, (data: any) => void> = new Map()
  private subscriptions: Map<string, any> = new Map()

  constructor(appId = "106629") {
    this.appId = "106629"
    this.url = `wss://ws.derivws.com/websockets/v3?app_id=106629`
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log("[v0] Deriv WebSocket connected")
        this.reconnectAttempts = 0
        // Resubscribe to any active subscriptions
        this.subscriptions.forEach((request, id) => {
          this.send(request)
        })
        resolve()
      }

      this.ws.onerror = (error) => {
        console.error("[v0] Deriv WebSocket error:", error)
        reject(error)
      }

      this.ws.onclose = () => {
        console.log("[v0] Deriv WebSocket closed")
        this.handleReconnect()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (error) {
          console.error("[v0] Failed to parse WebSocket message:", error)
        }
      }
    })
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[v0] Max reconnection attempts reached")
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1)

    console.log(`[v0] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error("[v0] Reconnection failed:", error)
      })
    }, delay)
  }

  private handleMessage(data: any) {
    const msgType = data.msg_type

    // Handle subscription responses
    if (data.subscription) {
      const handler = this.messageHandlers.get(data.subscription.id)
      if (handler) {
        handler(data)
      }
    }

    // Handle regular responses
    if (data.req_id) {
      const handler = this.messageHandlers.get(data.req_id.toString())
      if (handler) {
        handler(data)
        // Remove one-time handlers for non-subscription requests
        if (!data.subscription) {
          this.messageHandlers.delete(data.req_id.toString())
        }
      }
    }

    // Broadcast to all handlers for specific message types
    const typeHandler = this.messageHandlers.get(msgType)
    if (typeHandler) {
      typeHandler(data)
    }
  }

  send(request: any): string {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected")
    }

    const reqId = Date.now().toString() + Math.random().toString(36).substr(2, 9)
    const message = { ...request, req_id: reqId }

    this.ws.send(JSON.stringify(message))
    return reqId
  }

  async request(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const reqId = this.send(request)

        // Set timeout for response
        const timeout = setTimeout(() => {
          this.messageHandlers.delete(reqId)
          reject(new Error("Request timeout"))
        }, 30000)

        this.messageHandlers.set(reqId, (data) => {
          clearTimeout(timeout)
          if (data.error) {
            reject(data.error)
          } else {
            resolve(data)
          }
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  subscribe(request: any, handler: (data: any) => void): string {
    const subscriptionRequest = { ...request, subscribe: 1 }
    const reqId = this.send(subscriptionRequest)

    this.messageHandlers.set(reqId, handler)
    this.subscriptions.set(reqId, subscriptionRequest)

    return reqId
  }

  unsubscribe(subscriptionId: string) {
    this.messageHandlers.delete(subscriptionId)
    this.subscriptions.delete(subscriptionId)

    if (this.ws) {
      this.send({ forget: subscriptionId })
    }
  }

  disconnect() {
    this.subscriptions.clear()
    this.messageHandlers.clear()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  // API Methods
  async getActiveSymbols(landingCompany = "svg") {
    return this.request({
      active_symbols: "brief",
      product_type: "basic",
      landing_company: landingCompany,
    })
  }

  async getContractsFor(symbol: string) {
    return this.request({
      contracts_for: symbol,
      product_type: "basic",
    })
  }

  async getProposal(proposal: any) {
    return this.request({ proposal })
  }

  async buy(buyRequest: any) {
    return this.request({ buy: buyRequest.contract_id, price: buyRequest.price })
  }

  subscribeToTicks(symbol: string, handler: (data: any) => void): string {
    return this.subscribe({ ticks: symbol }, handler)
  }

  subscribeToTicksHistory(symbol: string, count = 100, handler: (data: any) => void): string {
    return this.subscribe(
      {
        ticks_history: symbol,
        count,
        end: "latest",
        style: "ticks",
      },
      handler,
    )
  }

  subscribeToProposal(proposal: any, handler: (data: any) => void): string {
    return this.subscribe({ proposal }, handler)
  }

  subscribeToOpenContract(contractId: string, handler: (data: any) => void): string {
    return this.subscribe(
      {
        proposal_open_contract: 1,
        contract_id: contractId,
      },
      handler,
    )
  }

  async getBalance() {
    return this.request({ balance: 1 })
  }

  async authorize(token: string) {
    return this.request({ authorize: token })
  }
}

// Singleton instance
let derivWSInstance: DerivWS | null = null

export function getDerivWS(appId?: string): DerivWS {
  if (!derivWSInstance) {
    derivWSInstance = new DerivWS(appId)
  }
  return derivWSInstance
}
