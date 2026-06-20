import type { DerivAPIClient } from "./deriv-api"

export interface TradeConfig {
  symbol: string
  contractType: string
  stake: number
  duration: number
  durationUnit: string
  currency: string
  barrier?: string
  prediction?: string
}

export interface TradeResult {
  contractId: number
  buyPrice: number
  payout: number
  profit: number
  marginProfit: number // 3% of payout
  totalProfit: number // profit + marginProfit
  isWin: boolean
  status: string
  timestamp: number
  entrySpot?: string
  exitSpot?: string
}

export class TradeExecutor {
  private apiClient: DerivAPIClient
  private marginPercentage = 3 // 3% margin profit per contract on wins only
  private lastTradeTime = 0
  private minTradeInterval = 300 // Minimum 300ms between trades to prevent rapid duplicates

  constructor(apiClient: DerivAPIClient) {
    this.apiClient = apiClient
  }

  /**
   * Execute a single trade and monitor for results
   * Returns a promise that resolves when the contract is settled
   * Added null trade prevention and enhanced validation
   */
  async executeTrade(config: TradeConfig): Promise<TradeResult> {
    return new Promise(async (resolve, reject) => {
      try {
        const now = Date.now()
        if (now - this.lastTradeTime < this.minTradeInterval) {
          console.log("[v0] Trade skipped - minimum interval not met")
          reject(new Error("Trade interval too short - skipped"))
          return
        }
        this.lastTradeTime = now

        // Step 1: Get proposal
        const proposalParams: any = {
          symbol: config.symbol,
          contract_type: config.contractType,
          amount: Number(config.stake.toFixed(2)),
          basis: "stake",
          duration: config.duration,
          duration_unit: config.durationUnit,
          currency: config.currency,
        }

        if (config.barrier !== undefined) {
          proposalParams.barrier = config.barrier
        }

        if (config.prediction !== undefined) {
          proposalParams.barrier = config.prediction
        }

        console.log("[v0] Getting proposal with params:", proposalParams)
        const proposal = await this.apiClient.getProposal(proposalParams)

        if (!proposal || !proposal.id) {
          throw new Error("Invalid proposal response - no proposal ID")
        }

        if (!proposal.payout || proposal.payout <= 0) {
          throw new Error("Invalid proposal - invalid payout")
        }

        if (!proposal.ask_price || proposal.ask_price <= 0) {
          throw new Error("Invalid proposal - invalid ask price")
        }

        console.log("[v0] Proposal received - Payout:", proposal.payout, "Ask Price:", proposal.ask_price)

        // Step 2: Buy contract
        const buyResponse = await this.apiClient.buyContract(proposal.id, proposal.ask_price)

        if (!buyResponse || !buyResponse.contract_id) {
          throw new Error("Invalid buy response - no contract ID")
        }

        if (buyResponse.contract_id <= 0) {
          throw new Error("Invalid contract ID received")
        }

        if (!buyResponse.buy_price || buyResponse.buy_price <= 0) {
          throw new Error("Invalid buy price received")
        }

        const contractId = buyResponse.contract_id
        console.log("[v0] Contract purchased - ID:", contractId, "Buy Price:", buyResponse.buy_price)

        // Step 3: Subscribe to contract updates and wait for settlement
        let subscriptionId: string | null = null
        let contractSettled = false
        let lastUpdateTime = Date.now()
        const timeoutDuration = 300000 // 5 minutes instead of 2

        const timeoutPromise = new Promise<TradeResult>((_, timeoutReject) => {
          const timeoutCheck = setInterval(() => {
            const timeSinceLastUpdate = Date.now() - lastUpdateTime
            if (timeSinceLastUpdate > timeoutDuration) {
              clearInterval(timeoutCheck)
              console.error("[v0] Contract monitoring timeout - no updates for 5 minutes")
              timeoutReject(new Error("Contract monitoring timeout"))
            }
          }, 5000) // Check every 5 seconds
        })

        const contractPromise = new Promise<TradeResult>(async (contractResolve, contractReject) => {
          try {
            console.log("[v0] Subscribing to contract updates for:", contractId)
            subscriptionId = await this.apiClient.subscribeProposalOpenContract(contractId, (contract) => {
              if (contractSettled) return

              lastUpdateTime = Date.now()

              console.log("[v0] Contract update:", {
                contract_id: contract.contract_id,
                status: contract.status,
                is_sold: contract.is_sold,
                profit: contract.profit,
                payout: contract.payout,
                sell_price: contract.sell_price,
                buy_price: contract.buy_price,
                current_spot: contract.current_spot,
              })

              if (contract.status === "sold" || contract.is_sold === 1 || contract.is_sold === true) {
                contractSettled = true

                const profit = contract.profit ?? 0
                const actualPayout = contract.sell_price ?? contract.payout ?? buyResponse.payout ?? 0
                const buyPrice = contract.buy_price ?? buyResponse.buy_price

                console.log("[v0] Payout calculation:", {
                  buy_price: buyPrice,
                  sell_price: contract.sell_price,
                  payout: contract.payout,
                  profit: contract.profit,
                  actualPayout,
                })

                if (actualPayout <= 0) {
                  console.warn("[v0] Invalid payout in settlement:", actualPayout)
                  return
                }

                const isWin = profit > 0
                const marginProfit = isWin ? (actualPayout * this.marginPercentage) / 100 : 0
                const totalProfit = profit + marginProfit

                console.log("[v0] Contract settled:", {
                  profit,
                  marginProfit,
                  totalProfit,
                  isWin,
                  entrySpot: contract.entry_spot,
                  exitSpot: contract.exit_spot,
                })

                const result: TradeResult = {
                  contractId,
                  buyPrice: buyPrice,
                  payout: actualPayout,
                  profit,
                  marginProfit: Number(marginProfit.toFixed(2)),
                  totalProfit: Number(totalProfit.toFixed(2)),
                  isWin,
                  status: contract.status || "sold",
                  timestamp: Date.now(),
                  entrySpot: contract.entry_spot?.toString(),
                  exitSpot: contract.exit_spot?.toString(),
                }

                if (subscriptionId) {
                  this.apiClient.forget(subscriptionId).catch((err) => {
                    console.log("[v0] Forget error (non-critical):", err)
                  })
                }

                contractResolve(result)
              }
            })

            console.log("[v0] Subscription established with ID:", subscriptionId)
          } catch (err) {
            console.error("[v0] Subscription error:", err)
            contractReject(err)
          }
        })

        const result = await Promise.race([contractPromise, timeoutPromise])

        if (subscriptionId) {
          await this.apiClient.forget(subscriptionId).catch(() => {})
        }

        resolve(result)
      } catch (err: any) {
        console.error("[v0] Trade execution error:", err)
        reject(err)
      }
    })
  }

  /**
   * Calculate expected profit including margin (only on wins)
   */
  calculateExpectedProfit(payout: number, stake: number): number {
    const marginProfit = (payout * this.marginPercentage) / 100
    return payout - stake + marginProfit
  }

  /**
   * Get margin profit for a given payout (only on wins)
   */
  getMarginProfit(payout: number): number {
    return Number(((payout * this.marginPercentage) / 100).toFixed(2))
  }

  /**
   * Reset trade timing (useful for testing or manual resets)
   */
  resetTradeTimer(): void {
    this.lastTradeTime = 0
  }
}
