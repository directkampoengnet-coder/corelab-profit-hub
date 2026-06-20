export interface TradeLog {
  id: string
  tab: "trade-now" | "autobot" | "speedbot"
  time: string
  market: string
  contractType: string
  entrySpot: number
  exitSpot: number
  stake: number
  payout: number
  profit: number
  result: "WIN" | "LOSS" | "ERROR"
  markup?: number
}

export interface TradeStats {
  totalStake: number
  totalPayout: number
  runs: number
  won: number
  lost: number
  profit: number
}

const STORAGE_KEY = "deriv_trade_logs"

export function getTradeLogs(tab?: string): TradeLog[] {
  if (typeof window === "undefined") return []
  const logs = localStorage.getItem(STORAGE_KEY)
  const allLogs: TradeLog[] = logs ? JSON.parse(logs) : []
  return tab ? allLogs.filter((log) => log.tab === tab) : allLogs
}

export function addTradeLog(log: Omit<TradeLog, "id">): TradeLog {
  if (typeof window === "undefined") return log as TradeLog

  const allLogs = getTradeLogs()
  const newLog: TradeLog = {
    ...log,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  }

  allLogs.push(newLog)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allLogs))
  return newLog
}

export function calculateStats(logs: TradeLog[]): TradeStats {
  return {
    totalStake: logs.reduce((sum, log) => sum + log.stake, 0),
    totalPayout: logs.reduce((sum, log) => sum + log.payout, 0),
    runs: logs.length,
    won: logs.filter((log) => log.result === "WIN").length,
    lost: logs.filter((log) => log.result === "LOSS").length,
    profit: logs.reduce((sum, log) => sum + log.profit, 0),
  }
}

export function clearTradeLogs(tab?: string): void {
  if (typeof window === "undefined") return

  if (tab) {
    const allLogs = getTradeLogs()
    const filtered = allLogs.filter((log) => log.tab !== tab)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function exportLogsAsCSV(logs: TradeLog[]): string {
  const headers = [
    "ID",
    "Time",
    "Tab",
    "Market",
    "Type",
    "Entry",
    "Exit",
    "Stake",
    "Payout",
    "Profit",
    "Result",
    "Markup %",
  ]
  const rows = logs.map((log) => [
    log.id,
    log.time,
    log.tab,
    log.market,
    log.contractType,
    log.entrySpot,
    log.exitSpot,
    log.stake,
    log.payout,
    log.profit,
    log.result,
    log.markup || "N/A",
  ])

  const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
  return csv
}
