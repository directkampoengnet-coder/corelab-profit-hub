export interface StrategyAnalysis {
  name: string
  signal: "BUY" | "SELL" | null
  power: number
  confidence: number
  description: string
}

export class TradingStrategies {
  // Strategy 1: Even/Odd
  analyzeEvenOdd(digits: number[]): StrategyAnalysis {
    if (digits.length === 0) {
      return { name: "Even/Odd", signal: null, power: 0, confidence: 0, description: "No data" }
    }

    const evenCount = digits.filter((d) => d % 2 === 0).length
    const oddCount = digits.length - evenCount
    const total = digits.length

    const evenPercentage = (evenCount / total) * 100
    const oddPercentage = (oddCount / total) * 100

    const power = Math.max(evenPercentage, oddPercentage)
    const signal = power >= 55 ? (evenPercentage > oddPercentage ? "BUY" : "SELL") : null

    return {
      name: "Even/Odd",
      signal,
      power,
      confidence: power - 50,
      description: `Even: ${evenPercentage.toFixed(1)}% | Odd: ${oddPercentage.toFixed(1)}%`,
    }
  }

  // Strategy 2: Over 3 / Under 6
  analyzeOver3Under6(digits: number[]): StrategyAnalysis {
    if (digits.length === 0) {
      return { name: "Over 3/Under 6", signal: null, power: 0, confidence: 0, description: "No data" }
    }

    const over3Count = digits.filter((d) => d > 3).length
    const under6Count = digits.filter((d) => d < 6).length
    const total = digits.length

    const over3Percentage = (over3Count / total) * 100
    const under6Percentage = (under6Count / total) * 100

    const power = Math.max(over3Percentage, under6Percentage)
    const signal = power >= 55 ? (over3Percentage > under6Percentage ? "BUY" : "SELL") : null

    return {
      name: "Over 3/Under 6",
      signal,
      power,
      confidence: power - 50,
      description: `Over 3: ${over3Percentage.toFixed(1)}% | Under 6: ${under6Percentage.toFixed(1)}%`,
    }
  }

  // Strategy 3: Over 2 / Under 7
  analyzeOver2Under7(digits: number[]): StrategyAnalysis {
    if (digits.length === 0) {
      return { name: "Over 2/Under 7", signal: null, power: 0, confidence: 0, description: "No data" }
    }

    const over2Count = digits.filter((d) => d > 2).length
    const under7Count = digits.filter((d) => d < 7).length
    const total = digits.length

    const over2Percentage = (over2Count / total) * 100
    const under7Percentage = (under7Count / total) * 100

    const power = Math.max(over2Percentage, under7Percentage)
    const signal = power >= 55 ? (over2Percentage > under7Percentage ? "BUY" : "SELL") : null

    return {
      name: "Over 2/Under 7",
      signal,
      power,
      confidence: power - 50,
      description: `Over 2: ${over2Percentage.toFixed(1)}% | Under 7: ${under7Percentage.toFixed(1)}%`,
    }
  }

  analyzeAllStrategies(digits: number[]): StrategyAnalysis[] {
    return [this.analyzeEvenOdd(digits), this.analyzeOver3Under6(digits), this.analyzeOver2Under7(digits)]
  }
}
