// Handles market analysis, pattern recognition, and trade signal generation

export interface TradeSignal {
  direction: "OVER" | "UNDER"
  strength: number
  confidence: number
  timestamp: Date
  reason: string
}

export interface MarketCondition {
  volatility: "low" | "medium" | "high"
  trend: "bullish" | "bearish" | "neutral"
  stability: "stable" | "moderate" | "unstable"
  reversalCount: number
}

export class TradingAnalysisService {
  private digitHistory: number[] = []
  private priceHistory: number[] = []
  private signalHistory: TradeSignal[] = []
  private readonly maxHistorySize = 2000

  analyzeDigitPattern(digits: number[]): {
    strongestDigit: number
    frequency: Record<number, number>
    pattern: string
  } {
    const frequency: Record<number, number> = {}

    for (let i = 0; i < 10; i++) {
      frequency[i] = 0
    }

    digits.forEach((digit) => {
      frequency[digit]++
    })

    const sorted = Object.entries(frequency).sort(([, a], [, b]) => b - a)
    const strongestDigit = Number.parseInt(sorted[0][0], 10)

    const pattern = strongestDigit > 5 ? "OVER_DOMINANT" : strongestDigit < 5 ? "UNDER_DOMINANT" : "BALANCED"

    return { strongestDigit, frequency, pattern }
  }

  calculateBiasStrength(digits: number[]): {
    direction: "OVER" | "UNDER"
    strength: number
  } {
    const over = digits.filter((d) => d > 5).length
    const under = digits.filter((d) => d <= 5).length
    const total = over + under

    if (total === 0) return { direction: "OVER", strength: 50 }

    const overPercentage = (over / total) * 100
    const underPercentage = (under / total) * 100

    return {
      direction: overPercentage > underPercentage ? "OVER" : "UNDER",
      strength: Math.max(overPercentage, underPercentage),
    }
  }

  detectReversals(digits: number[]): number {
    if (digits.length < 2) return 0

    let reversalCount = 0
    const isOver = (d: number) => d > 5

    for (let i = 1; i < digits.length; i++) {
      if (isOver(digits[i]) !== isOver(digits[i - 1])) {
        reversalCount++
      }
    }

    return reversalCount
  }

  calculateVolatility(prices: number[]): {
    score: number
    level: "low" | "medium" | "high"
  } {
    if (prices.length < 2) return { score: 0, level: "low" }

    const returns: number[] = []
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.abs(prices[i] - prices[i - 1]) / prices[i - 1])
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)
    const score = stdDev * 100

    return {
      score,
      level: score > 5 ? "high" : score > 2 ? "medium" : "low",
    }
  }

  assessMarketCondition(digits: number[], prices: number[]): MarketCondition {
    const reversals = this.detectReversals(digits)
    const volatility = this.calculateVolatility(prices)
    const bias = this.calculateBiasStrength(digits)

    const stability = reversals <= 2 ? "stable" : reversals <= 4 ? "moderate" : "unstable"

    const trend = bias.direction === "OVER" ? "bullish" : bias.direction === "UNDER" ? "bearish" : "neutral"

    return {
      volatility: volatility.level,
      trend,
      stability,
      reversalCount: reversals,
    }
  }

  generateTradeSignal(digits: number[], prices: number[], minBiasStrength = 62): TradeSignal | null {
    if (digits.length < 100) {
      return null
    }

    const bias = this.calculateBiasStrength(digits)
    const condition = this.assessMarketCondition(digits, prices)
    const pattern = this.analyzeDigitPattern(digits)

    if (bias.strength < minBiasStrength) {
      return null
    }

    if (condition.stability === "unstable") {
      return null
    }

    const confidence = Math.min((bias.strength / 100) * (condition.stability === "stable" ? 1 : 0.8), 1)

    const signal: TradeSignal = {
      direction: bias.direction,
      strength: bias.strength,
      confidence,
      timestamp: new Date(),
      reason: `${pattern.pattern} | Bias: ${bias.strength.toFixed(1)}% | Stability: ${condition.stability}`,
    }

    this.signalHistory.push(signal)
    if (this.signalHistory.length > 100) {
      this.signalHistory.shift()
    }

    return signal
  }

  getSignalAccuracy(): number {
    if (this.signalHistory.length === 0) return 0

    const recentSignals = this.signalHistory.slice(-20)
    const accurateSignals = recentSignals.filter((s) => s.confidence > 0.7).length

    return (accurateSignals / recentSignals.length) * 100
  }

  predictNextDigit(digits: number[]): {
    predictedDigit: number
    probability: number
  } {
    if (digits.length === 0) {
      return { predictedDigit: 5, probability: 0.5 }
    }

    const frequency: Record<number, number> = {}
    for (let i = 0; i < 10; i++) {
      frequency[i] = 0
    }

    digits.forEach((digit) => {
      frequency[digit]++
    })

    const sorted = Object.entries(frequency).sort(([, a], [, b]) => b - a)
    const predictedDigit = Number.parseInt(sorted[0][0], 10)
    const probability = sorted[0][1] / digits.length

    return { predictedDigit, probability }
  }

  addDigit(digit: number): void {
    this.digitHistory.push(digit)
    if (this.digitHistory.length > this.maxHistorySize) {
      this.digitHistory.shift()
    }
  }

  addPrice(price: number): void {
    this.priceHistory.push(price)
    if (this.priceHistory.length > this.maxHistorySize) {
      this.priceHistory.shift()
    }
  }

  getHistory() {
    return {
      digits: this.digitHistory,
      prices: this.priceHistory,
      signals: this.signalHistory,
    }
  }

  reset(): void {
    this.digitHistory = []
    this.priceHistory = []
    this.signalHistory = []
  }
}
