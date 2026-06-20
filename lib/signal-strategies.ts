"use client"

export interface SignalAnalysis {
  signal: "BUY" | "SELL" | null
  power: number
  confidence: number
  description: string
}

/**
 * Created comprehensive signal strategies library
 * Implements Even/Odd, Over/Under (multiple ranges), and Differs logic
 */

export class EvenOddStrategy {
  analyze(digits: number[]): SignalAnalysis {
    if (digits.length === 0) {
      return {
        signal: null,
        power: 0,
        confidence: 0,
        description: "No data available",
      }
    }

    const evenCount = digits.filter((d) => d % 2 === 0).length
    const oddCount = digits.filter((d) => d % 2 !== 0).length
    const total = evenCount + oddCount

    const evenPercent = (evenCount / total) * 100
    const oddPercent = (oddCount / total) * 100

    let signal: "BUY" | "SELL" | null = null
    let power = 0

    if (evenPercent > oddPercent + 15) {
      signal = "BUY"
      power = evenPercent
    } else if (oddPercent > evenPercent + 15) {
      signal = "SELL"
      power = oddPercent
    }

    return {
      signal,
      power,
      confidence: Math.abs(evenPercent - oddPercent),
      description: `Even: ${evenPercent.toFixed(1)}% | Odd: ${oddPercent.toFixed(1)}%`,
    }
  }
}

export class OverUnderStrategy {
  private overThreshold: number
  private underThreshold: number

  constructor(overThreshold: number, underThreshold: number) {
    this.overThreshold = overThreshold
    this.underThreshold = underThreshold
  }

  analyze(digits: number[]): SignalAnalysis {
    if (digits.length === 0) {
      return {
        signal: null,
        power: 0,
        confidence: 0,
        description: "No data available",
      }
    }

    const overCount = digits.filter((d) => d >= this.overThreshold).length
    const underCount = digits.filter((d) => d < this.underThreshold).length
    const total = overCount + underCount

    const overPercent = (overCount / total) * 100
    const underPercent = (underCount / total) * 100

    let signal: "BUY" | "SELL" | null = null
    let power = 0

    if (overPercent > underPercent + 15) {
      signal = "BUY"
      power = overPercent
    } else if (underPercent > overPercent + 15) {
      signal = "SELL"
      power = underPercent
    }

    return {
      signal,
      power,
      confidence: Math.abs(overPercent - underPercent),
      description: `Over ${this.overThreshold}: ${overPercent.toFixed(1)}% | Under ${this.underThreshold}: ${underPercent.toFixed(1)}%`,
    }
  }
}

export class DiffersStrategy {
  private targetDigit: number

  constructor(targetDigit: number) {
    this.targetDigit = targetDigit
  }

  analyze(digits: number[]): SignalAnalysis {
    if (digits.length === 0) {
      return {
        signal: null,
        power: 0,
        confidence: 0,
        description: "No data available",
      }
    }

    const matchCount = digits.filter((d) => d === this.targetDigit).length
    const differCount = digits.filter((d) => d !== this.targetDigit).length
    const total = matchCount + differCount

    const matchPercent = (matchCount / total) * 100
    const differPercent = (differCount / total) * 100

    let signal: "BUY" | "SELL" | null = null
    let power = 0

    if (differPercent > matchPercent + 15) {
      signal = "BUY"
      power = differPercent
    } else if (matchPercent > differPercent + 15) {
      signal = "SELL"
      power = matchPercent
    }

    return {
      signal,
      power,
      confidence: Math.abs(differPercent - matchPercent),
      description: `Match ${this.targetDigit}: ${matchPercent.toFixed(1)}% | Differ: ${differPercent.toFixed(1)}%`,
    }
  }
}
