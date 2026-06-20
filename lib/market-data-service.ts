// Provides continuous price updates and digit analysis

import { DerivWebSocket } from "./deriv-websocket"

export interface MarketDataUpdate {
  price: number
  digit: number
  timestamp: Date
  symbol: string
}

export interface DigitAnalysis {
  digit: number
  count: number
  percentage: number
  trend: "up" | "down" | "stable"
}

export class MarketDataService {
  private ws: DerivWebSocket | null = null
  private listeners: Map<string, Function[]> = new Map()
  private digitHistory: number[] = []
  private priceHistory: number[] = []
  private maxHistorySize = 1000

  constructor() {
    if (typeof window !== "undefined") {
      this.ws = new DerivWebSocket()
    }
  }

  async connect(symbol = "R_100"): Promise<void> {
    if (!this.ws) return

    return new Promise((resolve) => {
      this.ws!.onConnectionStatus((status) => {
        if (status === "connected") {
          this.ws!.subscribeTicks(symbol)
          this.setupTickListener()
          resolve()
        }
      })

      this.ws!.connect()
    })
  }

  private setupTickListener(): void {
    if (!this.ws) return

    this.ws.subscribe("tick", (data) => {
      if (data.tick) {
        const update: MarketDataUpdate = {
          price: data.tick.quote,
          digit: this.extractLastDigit(data.tick.quote),
          timestamp: new Date(),
          symbol: data.tick.symbol,
        }

        this.digitHistory.push(update.digit)
        this.priceHistory.push(update.price)

        if (this.digitHistory.length > this.maxHistorySize) {
          this.digitHistory.shift()
          this.priceHistory.shift()
        }

        this.emit("price-update", update)
      }
    })
  }

  private extractLastDigit(price: number): number {
    const priceStr = price.toString().replace(".", "")
    return Number.parseInt(priceStr[priceStr.length - 1], 10)
  }

  getDigitFrequencies(): Record<number, DigitAnalysis> {
    const frequencies: Record<number, number> = {}

    for (let i = 0; i < 10; i++) {
      frequencies[i] = 0
    }

    this.digitHistory.forEach((digit) => {
      frequencies[digit]++
    })

    const total = this.digitHistory.length || 1
    const analysis: Record<number, DigitAnalysis> = {}

    Object.entries(frequencies).forEach(([digit, count]) => {
      const digitNum = Number.parseInt(digit, 10)
      analysis[digitNum] = {
        digit: digitNum,
        count,
        percentage: (count / total) * 100,
        trend: this.calculateTrend(digitNum),
      }
    })

    return analysis
  }

  private calculateTrend(digit: number): "up" | "down" | "stable" {
    if (this.digitHistory.length < 20) return "stable"

    const recent = this.digitHistory.slice(-20)
    const older = this.digitHistory.slice(-40, -20)

    const recentCount = recent.filter((d) => d === digit).length
    const olderCount = older.filter((d) => d === digit).length

    if (recentCount > olderCount * 1.2) return "up"
    if (recentCount < olderCount * 0.8) return "down"
    return "stable"
  }

  getOverUnderAnalysis(): { over: number; under: number; total: number } {
    const over = this.digitHistory.filter((d) => d > 5).length
    const under = this.digitHistory.filter((d) => d <= 5).length

    return {
      over,
      under,
      total: over + under,
    }
  }

  getMarketPower(): number {
    const analysis = this.getOverUnderAnalysis()
    if (analysis.total === 0) return 50

    const overPercentage = (analysis.over / analysis.total) * 100
    return Math.max(overPercentage, 100 - overPercentage)
  }

  getLastDigits(count = 20): number[] {
    return this.digitHistory.slice(-count)
  }

  getCurrentPrice(): number | null {
    return this.priceHistory.length > 0 ? this.priceHistory[this.priceHistory.length - 1] : null
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => callback(data))
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.disconnect()
    }
    this.listeners.clear()
    this.digitHistory = []
    this.priceHistory = []
  }
}
