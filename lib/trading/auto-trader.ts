// Automated trading mode with signal-based entry
import type { DerivConnector } from "./connector"
import type { RiskManager } from "./risk"
import { TickBuffer } from "./signals"
import { TradeExecutor, type TradeConfig } from "./executor"
import { getConfig } from "./config"

export interface AutoTraderConfig {
  symbol: string
  contractType: string
  baseStake: number
  digitThreshold: number
  autoRestart: boolean
}

export class AutoTrader {
  private executor: TradeExecutor
  private tickBuffer: TickBuffer
  private running = false
  private subscriptionId: string | null = null

  constructor(
    private connector: DerivConnector,
    private riskManager: RiskManager,
  ) {
    this.executor = new TradeExecutor(connector, riskManager)
    this.tickBuffer = new TickBuffer(getConfig().TICK_HISTORY_SIZE)
  }

  async start(config: AutoTraderConfig): Promise<void> {
    if (!this.connector.isConnected()) {
      throw new Error("Connector not connected")
    }

    this.running = true

    // Subscribe to ticks
    await this.connector.send({
      ticks: config.symbol,
      subscribe: 1,
    })

    // Listen for ticks
    this.connector.on("tick", (tick) => this.onTick(tick, config))
  }

  private async onTick(tick: any, config: AutoTraderConfig): Promise<void> {
    if (!this.running || !this.riskManager.canOpenTrade()) {
      return
    }

    // Add tick to buffer
    this.tickBuffer.addTick(tick.quote, tick.epoch)

    // Check if we have enough history
    if (this.tickBuffer.size() < getConfig().TICK_HISTORY_SIZE) {
      return
    }

    // Get signal
    const { digit, frequency } = this.tickBuffer.getMostFrequentDigit()

    // Check threshold
    if (frequency < config.digitThreshold) {
      return
    }

    // Execute trade
    try {
      const tradeConfig: TradeConfig = {
        symbol: config.symbol,
        contractType: config.contractType,
        stake: this.riskManager.getStakeForAttempt(this.riskManager.getState().martingaleLevel),
        duration: 1,
        durationUnit: "t",
        digit: digit,
      }

      const tradeResult = await this.executor.executeTrade(tradeConfig)
      console.log("[v0] Auto trade opened:", tradeResult.contractId)

      // Monitor contract
      const finalResult = await this.executor.monitorContract(tradeResult.contractId)
      console.log("[v0] Auto trade closed:", finalResult)

      // Update risk manager
      this.riskManager.recordTrade(tradeConfig.stake, finalResult.profitLoss || 0)

      // Auto-restart delay
      if (config.autoRestart && this.running) {
        await new Promise((resolve) => setTimeout(resolve, getConfig().AUTO_RESTART_DELAY_S * 1000))
      }
    } catch (error) {
      console.error("[v0] Auto trade failed:", error)
    }
  }

  stop(): void {
    this.running = false
    this.connector.removeAllListeners("tick")
  }

  isRunning(): boolean {
    return this.running
  }
}
