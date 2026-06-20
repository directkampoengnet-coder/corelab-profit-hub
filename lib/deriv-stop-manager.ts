export class DerivStopManager {
  private wsConnections: WebSocket[] = []
  private activeTradeIds: Set<string> = new Set()
  private isTrading = false

  registerConnection(ws: WebSocket) {
    this.wsConnections.push(ws)
  }

  registerTrade(tradeId: string) {
    this.activeTradeIds.add(tradeId)
  }

  async stopAll() {
    console.log("[v0] 🛑 Stopping all trades and connections...")

    // Send forget_all to all active connections
    for (const ws of this.wsConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            forget_all: ["ticks", "proposal_open_contract", "balance", "transaction"],
          }),
        )
      }
    }

    // Clear all active trades
    this.activeTradeIds.clear()
    this.isTrading = false

    console.log("[v0] ✅ All trades and connections stopped")
  }

  setTrading(trading: boolean) {
    this.isTrading = trading
  }

  getActiveTradeCount() {
    return this.activeTradeIds.size
  }

  isCurrentlyTrading() {
    return this.isTrading
  }
}

export const stopManager = new DerivStopManager()
