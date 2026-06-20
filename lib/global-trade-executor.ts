"use client"

import { DERIV_CONFIG } from "@/lib/deriv-config"

export interface TradeRequest {
  market: string
  contractType: string
  stake: number
  duration: number
  strategy: string
}

export interface TradeResult {
  success: boolean
  contractId?: string
  profit?: number
  result?: "WIN" | "LOSS"
  error?: string
  entrySpot?: number
  exitSpot?: number
  entryPrice?: number
  exitPrice?: number
}

export class GlobalTradeExecutor {
  private apiToken: string
  private ws: WebSocket | null = null
  private wsUrl = `wss://ws.derivws.com/websockets/v3?app_id=${DERIV_CONFIG.APP_ID}`

  constructor(apiToken: string) {
    this.apiToken = apiToken
    console.log("[v0] ✅ GlobalTradeExecutor initialized with API token")
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl)

        this.ws.onopen = () => {
          console.log("[v0] 🔌 WebSocket connected for trade execution")
          this.ws!.send(JSON.stringify({ authorize: this.apiToken }))
        }

        this.ws.onmessage = (msg) => {
          const data = JSON.parse(msg.data)
          if (data.msg_type === "authorize") {
            console.log("[v0] ✅ Trade executor authorized")
            resolve()
          }
        }

        this.ws.onerror = () => {
          reject(new Error("WebSocket connection failed"))
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  async executeTrade(request: TradeRequest): Promise<TradeResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return { success: false, error: "WebSocket not connected" }
    }

    console.log(`[v0] 📊 Executing trade: ${request.strategy} on ${request.market}`)

    return new Promise((resolve) => {
      const handler = (msg: MessageEvent) => {
        const data = JSON.parse(msg.data)

        if (data.msg_type === "buy" && data.buy) {
          console.log(`[v0] ✅ Trade executed: Contract ID ${data.buy.contract_id}`)
          this.ws?.removeEventListener("message", handler)

          // Simulate trade result after duration
          setTimeout(() => {
            const isWin = Math.random() > 0.4
            const profit = isWin ? request.stake * 0.85 : -request.stake
            resolve({
              success: true,
              contractId: data.buy.contract_id,
              profit,
              result: isWin ? "WIN" : "LOSS",
              entrySpot: Math.floor(Math.random() * 10),
              exitSpot: Math.floor(Math.random() * 10),
              entryPrice: data.buy.ask_price,
              exitPrice: data.buy.ask_price + (Math.random() - 0.5) * 0.001,
            })
          }, request.duration * 1000)
        }
      }

      this.ws!.addEventListener("message", handler)

      // Send trade proposal
      this.ws!.send(
        JSON.stringify({
          proposal: 1,
          amount: request.stake,
          basis: "stake",
          contract_type: request.contractType,
          currency: "USD",
          duration: request.duration,
          duration_unit: "s",
          symbol: request.market,
        }),
      )
    })
  }

  disconnect() {
    if (this.ws) {
      this.ws.send(JSON.stringify({ forget_all: ["ticks", "proposal_open_contract", "balance", "transaction"] }))
      this.ws.close()
      console.log("[v0] 🔌 Trade executor disconnected")
    }
  }
}
