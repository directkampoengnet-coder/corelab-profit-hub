export interface ContractResult {
  contractId: number
  entrySpot: number
  exitSpot: number
  stake: number
  payout: number
  profit: number
  result: "WIN" | "LOSS"
  markup: number
}

export function determineWinLoss(profit: number): "WIN" | "LOSS" {
  return profit > 0 ? "WIN" : "LOSS"
}

export function calculateProfit(payout: number, stake: number): number {
  return payout - stake
}

export function calculateMarkup(appPayout: number, derivPayout: number): number {
  if (derivPayout === 0) return 0
  return ((appPayout - derivPayout) / derivPayout) * 100
}

export function formatTradeTime(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
}
