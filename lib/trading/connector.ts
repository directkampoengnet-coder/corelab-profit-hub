// WebSocket connector with auto-reconnect, ping, and synchronous request/response handling
import { EventEmitter } from "events"
import { getConfig } from "./config"

interface PendingRequest {
  resolve: (value: any) => void
  reject: (error: Error) => void
  timeout: NodeJS.Timeout
}

interface ConnectionState {
  isConnected: boolean
  isAuthorized: boolean
  reconnectAttempts: number
  lastConnectionTime: number | null
  lastMessageTime: number | null
  lastErrorMessage: string | null
}

export class DerivConnector extends EventEmitter {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 15 // increased from 10 to 15 for better stability
  private reconnectDelay = 1000
  private pingInterval: NodeJS.Timeout | null = null
  private healthCheckInterval: NodeJS.Timeout | null = null
  private pendingRequests = new Map<string, PendingRequest>()
  private messageId = 0
  private authorized = false
  private loginId: string | null = null
  private accountCurrency: string | null = null
  private connectionState: ConnectionState = {
    isConnected: false,
    isAuthorized: false,
    reconnectAttempts: 0,
    lastConnectionTime: null,
    lastMessageTime: null,
    lastErrorMessage: null,
  }
  private tokenRefreshAttempts = 0
  private maxTokenRefreshAttempts = 3

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const config = getConfig()
        const wsUrl = `${config.WS_URL}?app_id=${config.DERIV_APP_ID}`

        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log("[v0] ✅ WebSocket connected")
          this.connectionState.isConnected = true
          this.connectionState.lastConnectionTime = Date.now()
          this.reconnectAttempts = 0
          this.reconnectDelay = 1000
          this.tokenRefreshAttempts = 0 // reset token refresh on reconnect
          this.startPing()
          this.startHealthCheck() // add health check mechanism
          this.authorize().then(resolve).catch(reject)
        }

        this.ws.onmessage = (event) => {
          try {
            this.connectionState.lastMessageTime = Date.now()
            const data = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (error) {
            console.error("[v0] Failed to parse message:", error)
            this.connectionState.lastErrorMessage = `Parse error: ${error}`
          }
        }

        this.ws.onerror = (error) => {
          console.error("[v0] ❌ WebSocket error:", error)
          this.connectionState.lastErrorMessage = `Connection error: ${error}`
          this.emit("connection_error", { error, timestamp: Date.now() })
          reject(new Error("WebSocket connection failed"))
        }

        this.ws.onclose = () => {
          console.log("[v0] ⚠️ WebSocket closed")
          this.connectionState.isConnected = false
          this.connectionState.isAuthorized = false
          this.authorized = false
          this.stopPing()
          this.stopHealthCheck() // stop health check on close
          this.attemptReconnect()
        }
      } catch (error) {
        console.error("[v0] Connection setup error:", error)
        this.connectionState.lastErrorMessage = `Setup error: ${error}`
        reject(error)
      }
    })
  }

  private async authorize(): Promise<void> {
    const config = getConfig()

    try {
      const token = config.DERIV_API_TOKEN

      if (!token) {
        throw new Error("No API token provided in configuration")
      }

      const response = await this.sendAndWait(
        { authorize: token },
        "authorize",
        8000, // increased timeout to 8s for better stability
      )

      if (response.authorize) {
        this.authorized = true
        this.connectionState.isAuthorized = true
        this.loginId = response.authorize.loginid
        this.accountCurrency = response.authorize.currency
        console.log(`[v0] ✅ Authorized as ${this.loginId} (${this.accountCurrency})`)
        this.emit("authorized", { loginId: this.loginId, currency: this.accountCurrency })
      } else if (response.error) {
        throw new Error(`Authorization error: ${response.error.message}`)
      } else {
        throw new Error("Authorization response invalid")
      }
    } catch (error) {
      console.error("[v0] ❌ Authorization failed:", error)
      this.connectionState.lastErrorMessage = `Auth error: ${error}`
      this.tokenRefreshAttempts++

      if (this.tokenRefreshAttempts < this.maxTokenRefreshAttempts) {
        console.log(`[v0] Retrying authorization (${this.tokenRefreshAttempts}/${this.maxTokenRefreshAttempts})...`)
        await new Promise((resolve) => setTimeout(resolve, 2000))
        return this.authorize() // Retry
      }
      throw error
    }
  }

  private handleMessage(data: any): void {
    try {
      // Handle responses to pending requests
      if (data.req_id) {
        const pending = this.pendingRequests.get(data.req_id.toString())
        if (pending) {
          clearTimeout(pending.timeout)
          this.pendingRequests.delete(data.req_id.toString())

          if (data.error) {
            pending.reject(new Error(data.error.message))
          } else {
            pending.resolve(data)
          }
          return
        }
      }

      // Emit events for subscriptions
      if (data.tick) this.emit("tick", data.tick)
      if (data.proposal) this.emit("proposal", data.proposal)
      if (data.buy) this.emit("buy", data.buy)
      if (data.transaction) this.emit("transaction", data.transaction)
      if (data.balance) this.emit("balance", data.balance)
      if (data.error) {
        console.error("[v0] API error:", data.error)
        this.emit("api_error", data.error)
      }
    } catch (error) {
      console.error("[v0] Error in handleMessage:", error)
      this.connectionState.lastErrorMessage = `Handler error: ${error}`
    }
  }

  async send(payload: any): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected")
    }
    try {
      this.ws.send(JSON.stringify(payload))
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      this.connectionState.lastErrorMessage = `Send error: ${error}`
      throw error
    }
  }

  async sendAndWait(payload: any, expectedType: string, timeoutMs = 6000): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected")
    }

    const reqId = ++this.messageId
    const payloadWithId = { ...payload, req_id: reqId }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(reqId.toString())
        const errorMsg = `Timeout waiting for ${expectedType} after ${timeoutMs}ms`
        console.error(`[v0] ${errorMsg}`)
        this.connectionState.lastErrorMessage = errorMsg
        reject(new Error(errorMsg))
      }, timeoutMs)

      this.pendingRequests.set(reqId.toString(), { resolve, reject, timeout })

      try {
        this.ws!.send(JSON.stringify(payloadWithId))
      } catch (error) {
        clearTimeout(timeout)
        this.pendingRequests.delete(reqId.toString())
        reject(error)
      }
    })
  }

  private startPing(): void {
    this.stopPing() // Clear any existing interval
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.send({ ping: 1 }).catch((error) => {
            console.warn("[v0] Ping failed:", error)
          })
        } catch (error) {
          console.warn("[v0] Ping error:", error)
        }
      }
    }, 20000)
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private startHealthCheck(): void {
    this.stopHealthCheck()
    this.healthCheckInterval = setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.warn("[v0] Health check: WebSocket not open")
        return
      }

      const now = Date.now()
      const timeSinceLastMessage = this.connectionState.lastMessageTime ? now - this.connectionState.lastMessageTime : 0

      // If no messages for 45 seconds, trigger reconnect
      if (this.connectionState.lastMessageTime && timeSinceLastMessage > 45000) {
        console.warn(`[v0] No messages for ${timeSinceLastMessage}ms, reconnecting...`)
        this.disconnect()
        this.connect().catch(console.error)
      }
    }, 10000)
  }

  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[v0] ❌ Max reconnection attempts reached")
      this.emit("fatal_error", {
        message: "Connection lost - max retries exceeded",
        attempts: this.reconnectAttempts,
        timestamp: Date.now(),
      })
      return
    }

    this.reconnectAttempts++
    // Exponential backoff with max 60 second delay
    const delay = Math.min(this.reconnectDelay * Math.pow(2, Math.max(0, this.reconnectAttempts - 2)), 60000)
    const jitter = Math.random() * 2000

    console.log(
      `[v0] 🔄 Reconnecting in ${Math.round(delay + jitter)}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    )

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error("[v0] Reconnect failed:", error)
      })
    }, delay + jitter)
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.authorized
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState }
  }

  getLoginId(): string | null {
    return this.loginId
  }

  getCurrency(): string | null {
    return this.accountCurrency
  }

  disconnect(): void {
    console.log("[v0] Disconnecting WebSocket...")
    this.stopPing()
    this.stopHealthCheck()
    this.authorized = false
    this.connectionState.isConnected = false
    this.connectionState.isAuthorized = false
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

// Singleton instance
let connectorInstance: DerivConnector | null = null

export function getConnector(): DerivConnector {
  if (!connectorInstance) {
    connectorInstance = new DerivConnector()
  }
  return connectorInstance
}
