export interface TradeLog {
  id: string
  timestamp: number
  market: string
  strategy: string
  contractType: string
  stake: number
  entrySpot: number
  entryPrice: number
  exitSpot: number
  exitPrice: number
  profit: number
  profitPercent: number
  result: "WIN" | "LOSS"
  duration: number
  martingaleLevel: number
}

export class DerivTradeLogger {
  private logs: TradeLog[] = []
  private sessionStartTime = Date.now()

  addTrade(trade: Omit<TradeLog, "id">): TradeLog {
    const tradeLog: TradeLog = {
      ...trade,
      id: `${Date.now()}-${Math.random()}`,
    }
    this.logs.push(tradeLog)
    console.log(`[v0] 📊 Trade logged: ${trade.result} - Profit: ${trade.profit}`)
    return tradeLog
  }

  getLogs(): TradeLog[] {
    return [...this.logs]
  }

  getSessionStats() {
    const totalTrades = this.logs.length
    const wins = this.logs.filter((l) => l.result === "WIN").length
    const losses = this.logs.filter((l) => l.result === "LOSS").length
    const totalProfit = this.logs.reduce((sum, l) => sum + l.profit, 0)
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0

    return {
      totalTrades,
      wins,
      losses,
      totalProfit,
      winRate,
      sessionDuration: Date.now() - this.sessionStartTime,
    }
  }

  clear() {
    this.logs = []
    this.sessionStartTime = Date.now()
  }
}
