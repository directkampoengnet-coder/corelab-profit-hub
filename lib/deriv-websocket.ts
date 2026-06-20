export class DerivWebSocket {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private isIntentionallyClosed = false
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private connectionStatusListeners: Set<(status: "connected" | "disconnected" | "reconnecting") => void> = new Set()
  private connectionLogs: ConnectionLog[] = []
  private token: string | null = null
  private appId: string

  constructor(appId?: string | number, token?: string) {
    this.appId = appId ? String(appId) : "106629"
    this.token = token || null
  }

  setToken(token: string | null) {
    this.token = token
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isIntentionallyClosed = false
        const url = `wss://ws.derivws.com/websockets/v3?app_id=${this.appId}`
        console.log("[v0] Initiating Deriv API connection:", url)

        this.notifyConnectionStatus("reconnecting")

        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          console.log("[v0] Connected to Deriv API successfully")
          this.logConnection("info", "WebSocket connected")

          if (this.token) {
            this.authorize(this.token)
          }

          this.getActiveSymbols()

          this.reconnectAttempts = 0
          this.reconnectDelay = 1000
          this.notifyConnectionStatus("connected")
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (error) {
            console.error("[v0] Failed to parse message:", error)
          }
        }

        this.ws.onerror = (error) => {
          console.error("[v0] WebSocket error")
          this.logConnection("error", `WebSocket error occurred`)
          this.notifyConnectionStatus("disconnected")
          reject(error)
        }

        this.ws.onclose = () => {
          console.log("[v0] WebSocket connection closed")
          this.notifyConnectionStatus("disconnected")

          if (!this.isIntentionallyClosed) {
            this.attemptReconnect()
          }
        }

        setTimeout(() => {
          if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
            console.error("[v0] Connection timeout - retrying...")
            this.ws.close()
            reject(new Error("Connection timeout"))
          }
        }, 15000)
      } catch (error) {
        console.error("[v0] Connection failed:", error)
        this.notifyConnectionStatus("disconnected")
        reject(error)
      }
    })
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logConnection("error", "Max reconnection attempts reached")
      setTimeout(() => {
        this.reconnectAttempts = 0
        this.logConnection("info", "Resetting reconnection attempts, will try again")
        this.attemptReconnect()
      }, 60000)
      return
    }

    this.reconnectAttempts++
    this.notifyConnectionStatus("reconnecting")

    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000)
    this.logConnection(
      "info",
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    )

    setTimeout(() => {
      this.connect().catch((error) => {
        this.logConnection("error", `Reconnection failed: ${error}`)
      })
    }, delay)
  }

  private handleMessage(data: any) {
    const msgType = data.msg_type
    const listeners = this.listeners.get(msgType)

    if (listeners) {
      listeners.forEach((callback) => callback(data))
    }

    const wildcardListeners = this.listeners.get("*")
    if (wildcardListeners) {
      wildcardListeners.forEach((callback) => callback(data))
    }
  }

  send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
      this.logConnection(
        "info",
        `Sent: ${message.ticks ? `Subscribe to ${message.ticks}` : JSON.stringify(message).substring(0, 50)}`,
      )
    } else {
      this.logConnection("error", "Cannot send message: WebSocket not connected")
    }
  }

  subscribe(msgType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(msgType)) {
      this.listeners.set(msgType, new Set())
    }

    this.listeners.get(msgType)!.add(callback)

    return () => {
      const listeners = this.listeners.get(msgType)
      if (listeners) {
        listeners.delete(callback)
      }
    }
  }

  onConnectionStatus(callback: (status: "connected" | "disconnected" | "reconnecting") => void): () => void {
    this.connectionStatusListeners.add(callback)
    return () => {
      this.connectionStatusListeners.delete(callback)
    }
  }

  private notifyConnectionStatus(status: "connected" | "disconnected" | "reconnecting") {
    this.connectionStatusListeners.forEach((callback) => callback(status))
  }

  subscribeTicks(symbol: string): void {
    if (!this.isConnected()) {
      console.warn("[v0] Cannot subscribe - not connected, attempting reconnection...")
      if (!this.isIntentionallyClosed && this.reconnectAttempts === 0) {
        this.connect()
          .then(() => {
            this.subscribeTicks(symbol)
          })
          .catch((error) => {
            console.error("[v0] Reconnection failed:", error)
          })
      }
      return
    }
    this.send({
      ticks: symbol,
      subscribe: 1,
    })
    console.log(`[v0] Subscribed to ${symbol}`)
  }

  unsubscribeTicks(): void {
    if (!this.isConnected()) {
      console.warn("[v0] Cannot unsubscribe: not connected")
      return
    }
    this.send({
      forget_all: "ticks",
    })
    this.logConnection("info", "Unsubscribed from all ticks")
  }

  getActiveSymbols(): void {
    this.send({
      active_symbols: "brief",
      product_type: "basic",
    })
    this.logConnection("info", "Requested active symbols")
  }

  disconnect(): void {
    this.isIntentionallyClosed = true
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.logConnection("info", "Disconnected from WebSocket")
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  getConnectionLogs(): ConnectionLog[] {
    return [...this.connectionLogs]
  }

  private logConnection(type: "info" | "error" | "warning", message: string) {
    const log: ConnectionLog = {
      type,
      message,
      timestamp: new Date(),
    }
    this.connectionLogs.push(log)

    if (this.connectionLogs.length > 100) {
      this.connectionLogs.shift()
    }

    const logListeners = this.listeners.get("connection_log")
    if (logListeners) {
      logListeners.forEach((callback) => callback(log))
    }
  }

  private authorize(token: string): void {
    this.send({
      authorize: token,
    })
    this.logConnection("info", "Authorizing with token")
  }
}

export interface DerivSymbol {
  symbol: string
  display_name: string
  market: string
  market_display_name: string
  submarket: string
  submarket_display_name: string
  pip_size?: number
}

export interface ConnectionLog {
  type: "info" | "error" | "warning"
  message: string
  timestamp: Date
}
