export interface CachedMarket {
  symbol: string
  display_name: string
  market: string
  market_display_name: string
}

const MARKET_CACHE_KEY = "deriv_markets_cache"
const MARKET_CACHE_EXPIRY = 3600000 // 1 hour in milliseconds

export function getCachedMarkets(): CachedMarket[] | null {
  try {
    const cached = localStorage.getItem(MARKET_CACHE_KEY)
    if (!cached) return null

    const { data, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp > MARKET_CACHE_EXPIRY) {
      localStorage.removeItem(MARKET_CACHE_KEY)
      return null
    }

    return data
  } catch (error) {
    console.error("[v0] Error reading market cache:", error)
    return null
  }
}

export function setCachedMarkets(markets: CachedMarket[]): void {
  try {
    localStorage.setItem(
      MARKET_CACHE_KEY,
      JSON.stringify({
        data: markets,
        timestamp: Date.now(),
      }),
    )
  } catch (error) {
    console.error("[v0] Error writing market cache:", error)
  }
}

export function clearMarketCache(): void {
  try {
    localStorage.removeItem(MARKET_CACHE_KEY)
  } catch (error) {
    console.error("[v0] Error clearing market cache:", error)
  }
}
