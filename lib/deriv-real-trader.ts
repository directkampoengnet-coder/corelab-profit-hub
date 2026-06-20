import type { DerivAPIClient } from "./deriv-api"
import { EventEmitter } from "events"

export interface TradeConfig {
  symbol: string
  contractType: string
  stake: string | number
  duration: number
  durationUnit: string
  barrier?: string
  prediction?: number
}

export interface TradeResult {
  contractId: number
  buyPrice: number
  payout: number
  profit: number
  isWin: boolean
  timestamp: Date
  entrySpot?: number
  exitSpot?: number
}

export class DerivRealTrader extends EventEmitter {
  private apiClient: DerivAPIClient
  private activeContracts: Map<number, any> = new Map()
  private tradeHistory: TradeResult[] = []
  private totalProfit = 0
  private maxTrades = 100
  private tradesExecuted = 0
  private pendingTrades: Map<number, { resolve: (result: TradeResult | null) => void }> = new Map()

  constructor(apiClient: DerivAPIClient) {
    super()
    this.apiClient = apiClient
  }

  async executeTrade(config: TradeConfig): Promise<TradeResult | null> {
    try {
      if (this.tradesExecuted >= this.maxTrades) {
        console.log("[v0] Max trades reached")
        this.emit("max-trades-reached")
        return null
      }

      console.log("[v0] Executing trade:", config)

      const stakeAmount = typeof config.stake === "string" ? Number.parseFloat(config.stake) : config.stake

      let duration = config.duration || 5
      let durationUnit = config.durationUnit || "t"

      // For digit contracts, ensure minimum 5 ticks
      if (config.contractType.includes("DIGIT")) {
        if (duration < 5) {
          console.log(`[v0] Adjusting duration from ${duration} to 5 ticks for digit contract`)
          duration = 5
        }
        durationUnit = "t" // Force ticks for digit contracts
      }

      const proposalRequest: any = {
        symbol: config.symbol,
        contract_type: config.contractType,
        amount: stakeAmount,
        basis: "stake",
        duration: duration,
        duration_unit: durationUnit,
        currency: "USD",
      }

      if (config.barrier) {
        proposalRequest.barrier = config.barrier
      }

      const proposal = await this.apiClient.getProposal(proposalRequest)

      console.log("[v0] Proposal received:", {
        id: proposal.id,
        askPrice: proposal.ask_price,
        payout: proposal.payout,
        spot: proposal.spot,
      })

      const buyResponse = await this.apiClient.buyContract(proposal.id, proposal.ask_price)

      console.log("[v0] Contract bought:", {
        contractId: buyResponse.contract_id,
        buyPrice: buyResponse.buy_price,
        payout: buyResponse.payout,
      })

      const contractId = buyResponse.contract_id
      const buyPrice = buyResponse.buy_price

      return new Promise((resolve) => {
        this.activeContracts.set(contractId, {
          buyPrice,
          payout: buyResponse.payout,
          startTime: new Date(),
          isSold: false,
        })

        this.pendingTrades.set(contractId, { resolve })
        this.tradesExecuted++

        this.apiClient
          .subscribeProposalOpenContract(contractId, (contract) => {
            this.handleContractUpdate(contractId, contract)
          })
          .catch((err) => {
            console.error("[v0] Subscription error:", err)
            resolve(null)
          })

        this.emit("trade-executed", { contractId, buyPrice })
      })
    } catch (error) {
      console.error("[v0] Trade execution error:", error)
      this.emit("trade-error", error)
      return null
    }
  }

  private handleContractUpdate(contractId: number, contract: any) {
    const activeContract = this.activeContracts.get(contractId)
    if (!activeContract) return

    console.log("[v0] Contract update:", {
      contractId,
      is_sold: contract.is_sold,
      profit: contract.profit,
      status: contract.status,
    })

    if (contract.is_sold || contract.status === "sold") {
      const profit = contract.profit || 0
      const isWin = profit > 0

      const result: TradeResult = {
        contractId,
        buyPrice: activeContract.buyPrice,
        payout: contract.payout || activeContract.payout,
        profit,
        isWin,
        timestamp: new Date(),
        entrySpot: contract.entry_tick_display_value || contract.entry_tick,
        exitSpot: contract.exit_tick_display_value || contract.exit_tick,
      }

      console.log(`[v0] Contract ${contractId} closed: ${isWin ? "WIN" : "LOSS"}, Profit: ${profit.toFixed(2)}`)

      this.tradeHistory.push(result)
      this.totalProfit += profit

      this.activeContracts.delete(contractId)

      const pending = this.pendingTrades.get(contractId)
      if (pending) {
        pending.resolve(result)
        this.pendingTrades.delete(contractId)
      }

      this.emit("trade-closed", result)
    }
  }

  getTradeHistory(): TradeResult[] {
    return [...this.tradeHistory]
  }

  getTotalProfit(): number {
    return this.totalProfit
  }

  getTradesExecuted(): number {
    return this.tradesExecuted
  }

  getActiveContractCount(): number {
    return this.activeContracts.size
  }

  reset() {
    this.activeContracts.clear()
    this.tradeHistory = []
    this.totalProfit = 0
    this.tradesExecuted = 0
    this.pendingTrades.clear()
  }
}
