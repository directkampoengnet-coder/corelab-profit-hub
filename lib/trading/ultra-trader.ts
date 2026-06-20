// Ultra-speed trading: one trade per tick with minimal latency
import type { DerivConnector } from "./connector"
import type { RiskManager } from "./risk"
import { TickBuffer } from "./signals"
import { TradeExecutor, type TradeConfig } from "./executor"
import { getConfig } from "./config"

export interface UltraTraderConfig {
  symbol: string
  contractType: string
  baseStake: number
  maxLatencyMs: number
}

export class UltraTrader {
  private executor: TradeExecutor
  private tickBuffer: TickBuffer
  private running = false
  private tickLock = false
  private skippedDueToLatency = 0
  private tradesExecuted = 0

  constructor(
    private connector: DerivConnector,
    private riskManager: RiskManager,
  ) {
    this.executor = new TradeExecutor(connector, riskManager)
    this.tickBuffer = new TickBuffer(getConfig().TICK_HISTORY_SIZE)
  }

  async start(config: UltraTraderConfig): Promise<void> {
    if (!this.connector.isConnected()) {
      throw new Error("Connector not connected")
    }

    this.running = true
    this.skippedDueToLatency = 0
    this.tradesExecuted = 0

    // Subscribe to ticks
    await this.connector.send({
      ticks: config.symbol,
      subscribe: 1,
    })

    // Listen for ticks with minimal latency path
    this.connector.on("tick", (tick) => this.onTickUltraSpeed(tick, config))
  }

  private onTickUltraSpeed(tick: any, config: UltraTraderConfig): void {
    // Non-blocking lock check - skip if already processing
    if (this.tickLock) {
      this.skippedDueToLatency++
      return
    }

    this.tickLock = true

    try {
      // Add tick to buffer
      this.tickBuffer.addTick(tick.quote, tick.epoch)

      // Quick decision logic
      if (!this.running || !this.riskManager.canOpenTrade()) {
        return
      }

      // Get last digit for immediate decision
      const lastDigit = this.tickBuffer.getLastDigit()

      // Execute trade immediately (fire and forget with timeout)
      this.executeUltraSpeedTrade(config, lastDigit).catch((error) => {
        console.error("[v0] Ultra trade error:", error)
      })
    } finally {
      this.tickLock = false
    }
  }

  private async executeUltraSpeedTrade(config: UltraTraderConfig, digit: number): Promise<void> {
    const startTime = Date.now()

    try {
      const tradeConfig: TradeConfig = {
        symbol: config.symbol,
        contractType: config.contractType,
        stake: this.riskManager.getStakeForAttempt(this.riskManager.getState().martingaleLevel),
        duration: 1,
        durationUnit: "t",
        digit: digit,
      }

      // Execute with latency timeout
      const tradeResult = await Promise.race([
        this.executor.executeTrade(tradeConfig),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Ultra trade latency exceeded")), config.maxLatencyMs),
        ),
      ])

      const latency = Date.now() - startTime
      console.log(`[v0] Ultra trade executed in ${latency}ms`)

      this.tradesExecuted++

      // Monitor contract with timeout
      const finalResult = await Promise.race([
        this.executor.monitorContract((tradeResult as any).contractId, 30000),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Monitor timeout")), 30000)),
      ])

      // Update risk manager
      this.riskManager.recordTrade(tradeConfig.stake, (finalResult as any).profitLoss || 0)
    } catch (error) {
      console.error("[v0] Ultra trade execution failed:", error)
    }
  }

  stop(): void {
    this.running = false
    this.connector.removeAllListeners("tick")
  }

  isRunning(): boolean {
    return this.running
  }

  getStats(): { executed: number; skipped: number } {
    return {
      executed: this.tradesExecuted,
      skipped: this.skippedDueToLatency,
    }
  }
}
