// Manual trading mode
import type { DerivConnector } from "./connector"
import type { RiskManager } from "./risk"
import { TradeExecutor, type TradeConfig } from "./executor"

export interface ManualTradeRequest {
  symbol: string
  contractType: string
  stake: number
  duration: number
  digit?: number
  autoRestart?: boolean
}

export class ManualTrader {
  private executor: TradeExecutor
  private running = false
  private autoRestart = false

  constructor(
    private connector: DerivConnector,
    private riskManager: RiskManager,
  ) {
    this.executor = new TradeExecutor(connector, riskManager)
  }

  async startTrade(request: ManualTradeRequest): Promise<void> {
    if (!this.connector.isConnected()) {
      throw new Error("Connector not connected")
    }

    if (!this.riskManager.getState().balance) {
      throw new Error("Balance not loaded")
    }

    this.running = true
    this.autoRestart = request.autoRestart || false

    try {
      await this.executeTrade(request)
    } catch (error) {
      console.error("[v0] Manual trade failed:", error)
      this.running = false
      throw error
    }
  }

  private async executeTrade(request: ManualTradeRequest): Promise<void> {
    const config: TradeConfig = {
      symbol: request.symbol,
      contractType: request.contractType,
      stake: request.stake,
      duration: request.duration,
      durationUnit: "t",
      digit: request.digit,
    }

    try {
      // Execute trade
      const tradeResult = await this.executor.executeTrade(config)
      console.log("[v0] Trade opened:", tradeResult.contractId)

      // Monitor contract
      const finalResult = await this.executor.monitorContract(tradeResult.contractId)
      console.log("[v0] Trade closed:", finalResult)

      // Update risk manager
      this.riskManager.recordTrade(request.stake, finalResult.profitLoss || 0)

      // Auto-restart if enabled
      if (this.autoRestart && this.running) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await this.executeTrade(request)
      }
    } catch (error) {
      console.error("[v0] Trade execution error:", error)
      throw error
    }
  }

  stop(): void {
    this.running = false
  }

  isRunning(): boolean {
    return this.running
  }
}
