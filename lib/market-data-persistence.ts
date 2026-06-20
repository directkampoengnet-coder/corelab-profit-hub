"use client"

/**
 * Market Data Persistence Layer
 * Saves and retrieves market data from IndexedDB to prevent loss on page restart
 */

import type { TickData, AnalysisResult } from "@/lib/analysis-engine"

interface StoredMarketData {
  symbol: string
  timestamp: number
  ticks: TickData[]
  analysis: AnalysisResult | null
  lastUpdated: number
}

export class MarketDataPersistence {
  private static DB_NAME = "ProfitHubDB"
  private static DB_VERSION = 1
  private static STORE_NAME = "marketData"

  private static async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB not available"))
        return
      }

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: "symbol" })
        }
      }
    })
  }

  static async saveMarketData(symbol: string, ticks: TickData[], analysis: AnalysisResult | null): Promise<void> {
    try {
      const db = await this.getDB()
      const tx = db.transaction([this.STORE_NAME], "readwrite")
      const store = tx.objectStore(this.STORE_NAME)

      const data: StoredMarketData = {
        symbol,
        timestamp: Date.now(),
        ticks,
        analysis,
        lastUpdated: Date.now(),
      }

      await new Promise<void>((resolve, reject) => {
        const request = store.put(data)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      })

      console.log(`[v0] Market data saved for ${symbol}`)
    } catch (error) {
      console.error("[v0] Failed to save market data:", error)
    }
  }

  static async loadMarketData(symbol: string): Promise<StoredMarketData | null> {
    try {
      const db = await this.getDB()
      const tx = db.transaction([this.STORE_NAME], "readonly")
      const store = tx.objectStore(this.STORE_NAME)

      return new Promise((resolve, reject) => {
        const request = store.get(symbol)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const data = request.result as StoredMarketData | undefined
          if (data) {
            console.log(`[v0] Loaded market data for ${symbol} (${data.ticks.length} ticks)`)
          }
          resolve(data || null)
        }
      })
    } catch (error) {
      console.error("[v0] Failed to load market data:", error)
      return null
    }
  }

  static async clearOldData(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const db = await this.getDB()
      const tx = db.transaction([this.STORE_NAME], "readwrite")
      const store = tx.objectStore(this.STORE_NAME)

      const cutoffTime = Date.now() - maxAgeMs

      await new Promise<void>((resolve, reject) => {
        const request = store.openCursor()
        request.onerror = () => reject(request.error)
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null
          if (cursor) {
            if (cursor.value.lastUpdated < cutoffTime) {
              cursor.delete()
            }
            cursor.continue()
          } else {
            resolve()
          }
        }
      })
    } catch (error) {
      console.error("[v0] Failed to clear old data:", error)
    }
  }
}
