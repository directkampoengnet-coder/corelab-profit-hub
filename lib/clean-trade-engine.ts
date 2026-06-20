import type { DerivAPIClient } from "./deriv-api"

export interface TradeParams {
  symbol: string
  contractType: string
  stake: number
  duration: number
  durationUnit: string
  currency: string
  barrier?: string
}

export interface TradeExecutionResult {
  contractId: number
  win: boolean
  profit: number
  payout: number
  entrySpot?: number
  exitSpot?: number
}

export class CleanTradeEngine {
  private apiClient: DerivAPIClient

  constructor(apiClient: DerivAPIClient) {
    this.apiClient = apiClient
  }

  async execute(params: TradeParams): Promise<TradeExecutionResult> {
    console.log("[v0] CleanTradeEngine: Executing trade with params:", params)

    // Build proposal request
    const proposalRequest: any = {
      symbol: params.symbol,
      contract_type: params.contractType,
      amount: params.stake,
      basis: "stake",
      duration: params.duration,
      duration_unit: params.durationUnit,
      currency: params.currency,
    }

    if (params.barrier) {
      proposalRequest.barrier = params.barrier
    }

    console.log("[v0] CleanTradeEngine: Requesting proposal:", proposalRequest)

    // Get proposal
    const proposal = await this.apiClient.getProposal(proposalRequest)
    console.log("[v0] CleanTradeEngine: Proposal received:", {
      id: proposal.id,
      askPrice: proposal.ask_price,
      payout: proposal.payout,
    })

    // Buy contract
    const buyResponse = await this.apiClient.buyContract(proposal.id, proposal.ask_price)
    const contractId = buyResponse.contract_id
    console.log("[v0] CleanTradeEngine: Contract purchased:", {
      contractId,
      buyPrice: buyResponse.buy_price,
      payout: buyResponse.payout,
    })

    // Wait for contract to close
    return new Promise((resolve, reject) => {
      this.apiClient
        .subscribeProposalOpenContract(contractId, (contract) => {
          console.log("[v0] CleanTradeEngine: Contract update:", {
            contractId,
            is_sold: contract.is_sold,
            status: contract.status,
            profit: contract.profit,
          })

          if (contract.is_sold || contract.status === "sold") {
            const profit = contract.profit || 0
            const win = profit > 0

            const result: TradeExecutionResult = {
              contractId,
              win,
              profit,
              payout: contract.payout || buyResponse.payout,
              entrySpot: contract.entry_tick_display_value || contract.entry_tick,
              exitSpot: contract.exit_tick_display_value || contract.exit_tick,
            }

            console.log(`[v0] CleanTradeEngine: Trade closed - ${win ? "WIN" : "LOSS"} | Profit: ${profit.toFixed(2)}`)
            resolve(result)
          }
        })
        .catch((error) => {
          console.error("[v0] CleanTradeEngine: Subscription error:", error)
          reject(error)
        })
    })
  }
}
