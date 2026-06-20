import { EventEmitter } from "events"

export interface JournalEntry {
  id: string
  timestamp: Date
  type: "TRADE" | "ANALYSIS"
  action: "WIN" | "LOSS" | "ANALYSIS_COMPLETE"
  stake: number
  profit: number
  contractType: string
  market: string
  strategy: string
  volatility?: string
  entryPrice?: number
  exitPrice?: number
  payout?: number
  winCondition?: string
}

export interface JournalStats {
  totalTrades: number
  totalWins: number
  totalLosses: number
  totalProfit: number
  totalStake: number
  winRate: number
  averageProfit: number
  runs: number
}

export class TradingJournal extends EventEmitter {
  private entries: JournalEntry[] = []
  private stats: JournalStats = {
    totalTrades: 0,
    totalWins: 0,
    totalLosses: 0,
    totalProfit: 0,
    totalStake: 0,
    winRate: 0,
    averageProfit: 0,
    runs: 0,
  }

  private storageKey: string

  constructor(tabName: string) {
    super()
    this.storageKey = `trading_journal_${tabName}`
    this.loadFromStorage()
  }

  addEntry(entry: Omit<JournalEntry, "id" | "timestamp">): JournalEntry {
    const newEntry: JournalEntry = {
      ...entry,
      id: `${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
    }

    this.entries.push(newEntry)
    this.updateStats()
    this.saveToStorage()
    this.emit("entry-added", newEntry)

    return newEntry
  }

  private updateStats() {
    const trades = this.entries.filter((e) => e.type === "TRADE")

    this.stats.totalTrades = trades.length
    this.stats.totalWins = trades.filter((e) => e.action === "WIN").length
    this.stats.totalLosses = trades.filter((e) => e.action === "LOSS").length
    this.stats.totalProfit = trades.reduce((sum, e) => sum + e.profit, 0)
    this.stats.totalStake = trades.reduce((sum, e) => sum + e.stake, 0)
    this.stats.winRate = this.stats.totalTrades > 0 ? (this.stats.totalWins / this.stats.totalTrades) * 100 : 0
    this.stats.averageProfit = this.stats.totalTrades > 0 ? this.stats.totalProfit / this.stats.totalTrades : 0
    this.stats.runs = this.entries.filter((e) => e.action === "ANALYSIS_COMPLETE").length

    this.emit("stats-updated", this.stats)
  }

  getStats(): JournalStats {
    return { ...this.stats }
  }

  getEntries(limit = 100): JournalEntry[] {
    return this.entries.slice(-limit)
  }

  clearJournal() {
    this.entries = []
    this.updateStats()
    this.saveToStorage()
    this.emit("journal-cleared")
  }

  private saveToStorage() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.entries))
      } catch (error) {
        console.error("[v0] Failed to save journal:", error)
      }
    }
  }

  private loadFromStorage() {
    if (typeof window !== "undefined") {
      try {
        const data = localStorage.getItem(this.storageKey)
        if (data) {
          this.entries = JSON.parse(data).map((e: any) => ({
            ...e,
            timestamp: new Date(e.timestamp),
          }))
          this.updateStats()
        }
      } catch (error) {
        console.error("[v0] Failed to load journal:", error)
      }
    }
  }
}
