export class TickHistoryManager {
  private tickBuffers = new Map<string, number[]>()
  private priceBuffers = new Map<string, number[]>()
  private subscriptions = new Map<string, string>()
  private lastFetchTime = new Map<string, number>()
  private readonly FETCH_COOLDOWN = 60000 // 60 seconds between fetches
  private isLoading = false
  private loadQueue: Array<{ symbol: string; count: number; resolve: () => void }> = []
  private apiClient: any

  constructor(apiClient: any) {
    this.apiClient = apiClient
  }

  async loadTickHistorySequentially(symbols: string[], count = 100): Promise<void> {
    console.log(`[v0] Loading tick history for ${symbols.length} symbols sequentially...`)

    for (const symbol of symbols) {
      try {
        // Check if we already have cached data and it's recent
        const lastFetch = this.lastFetchTime.get(symbol) || 0
        const now = Date.now()
        
        if (now - lastFetch < this.FETCH_COOLDOWN) {
          console.log(`[v0] Using cached data for ${symbol}`)
          continue
        }

        console.log(`[v0] Fetching history for ${symbol}...`)
        const response = await this.apiClient.send({
          ticks_history: symbol,
          count,
          end: "latest",
          style: "ticks",
        })

        if (!response.history?.prices) {
          console.error(`[v0] No price data received for ${symbol}`)
          continue
        }

        const latestDigits = response.history.prices.map((price: number) => {
          const priceStr = price.toString()
          const cleanStr = priceStr.replace(".", "")
          const lastChar = cleanStr[cleanStr.length - 1]
          return Number.parseInt(lastChar)
        })

        this.tickBuffers.set(symbol, latestDigits)
        this.priceBuffers.set(symbol, response.history.prices)
        this.lastFetchTime.set(symbol, now)
        console.log(
          `[v0] Loaded ${latestDigits.length} ticks for ${symbol}, first few: ${latestDigits.slice(0, 5).join(", ")}`,
        )

        // Wait 2 seconds between requests to avoid rate limiting
        await new Promise((r) => setTimeout(r, 2000))
      } catch (error) {
        console.error(`[v0] Error loading history for ${symbol}:`, error)
        // Continue with next symbol even if one fails
      }
    }

    console.log(`[v0] Finished loading tick history for all symbols`)
  }

  async subscribeToMarkets(symbols: string[]): Promise<void> {
    console.log(`[v0] Subscribing to ${symbols.length} markets for live updates...`)

    for (const symbol of symbols) {
      try {
        const response = await this.apiClient.send({
          ticks: symbol,
          subscribe: 1,
        })

        if (response.subscription?.id) {
          this.subscriptions.set(symbol, response.subscription.id)
          console.log(`[v0] Subscribed to ${symbol} with ID: ${response.subscription.id}`)
        }

        // Set up tick handler
        this.apiClient.onMessage().subscribe((message: any) => {
          if (message.tick && message.subscription?.id === this.subscriptions.get(symbol)) {
            this.handleTickUpdate(symbol, message.tick.quote)
          }
        })

        // Small delay between subscriptions
        await new Promise((r) => setTimeout(r, 500))
      } catch (error) {
        console.error(`[v0] Error subscribing to ${symbol}:`, error)
      }
    }
  }

  private handleTickUpdate(symbol: string, price: number): void {
    const buffer = this.tickBuffers.get(symbol) || []
    const priceBuffer = this.priceBuffers.get(symbol) || []

    const priceStr = price.toString()
    const cleanStr = priceStr.replace(".", "")
    const lastChar = cleanStr[cleanStr.length - 1]
    const lastDigit = Number.parseInt(lastChar)

    console.log(`[v0] ${symbol} tick: ${price} → last digit: ${lastDigit}`)

    buffer.push(lastDigit)
    priceBuffer.push(price)

    // Keep only last 100 ticks in rolling buffer
    if (buffer.length > 100) {
      buffer.shift()
      priceBuffer.shift()
    }

    this.tickBuffers.set(symbol, buffer)
    this.priceBuffers.set(symbol, priceBuffer)
  }

  getTickBuffer(symbol: string): number[] {
    return this.tickBuffers.get(symbol) || []
  }

  getLatestPrice(symbol: string): number | null {
    const prices = this.priceBuffers.get(symbol)
    if (!prices || prices.length === 0) return null
    return prices[prices.length - 1]
  }

  getPriceBuffer(symbol: string): number[] {
    return this.priceBuffers.get(symbol) || []
  }

  async cleanup(): Promise<void> {
    console.log("[v0] Cleaning up tick subscriptions...")

    for (const [symbol, subscriptionId] of this.subscriptions.entries()) {
      try {
        await this.apiClient.send({ forget: subscriptionId })
      } catch (error) {
        console.log(`[v0] Error forgetting subscription for ${symbol}:`, error)
      }
    }

    this.subscriptions.clear()
    this.tickBuffers.clear()
    this.priceBuffers.clear()
    this.lastFetchTime.clear()
  }
}
