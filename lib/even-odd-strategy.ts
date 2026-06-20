export interface EvenOddAnalysis {
  evenCount: number
  oddCount: number
  evenPercentage: number
  oddPercentage: number
  strongerSide: "EVEN" | "ODD"
  power: number
  isReadyToTrade: boolean
  consecutiveOpposites: number
  recommendedTrade: "EVEN" | "ODD" | null
}

export class EvenOddStrategy {
  private powerThreshold = 55
  private consecutiveThreshold = 2

  analyzeDigits(digits: number[]): EvenOddAnalysis {
    if (digits.length === 0) {
      return {
        evenCount: 0,
        oddCount: 0,
        evenPercentage: 0,
        oddPercentage: 0,
        strongerSide: "EVEN",
        power: 0,
        isReadyToTrade: false,
        consecutiveOpposites: 0,
        recommendedTrade: null,
      }
    }

    const evenCount = digits.filter((d) => d % 2 === 0).length
    const oddCount = digits.length - evenCount
    const total = digits.length

    const evenPercentage = (evenCount / total) * 100
    const oddPercentage = (oddCount / total) * 100

    const strongerSide = evenPercentage > oddPercentage ? "EVEN" : "ODD"
    const power = Math.max(evenPercentage, oddPercentage)

    // Check for consecutive opposites
    const consecutiveOpposites = this.countConsecutiveOpposites(digits, strongerSide)

    // Entry rule: Wait for 2+ consecutive opposite digits, then trade the favored direction
    const isReadyToTrade = power >= this.powerThreshold && consecutiveOpposites >= this.consecutiveThreshold

    const recommendedTrade = isReadyToTrade ? strongerSide : null

    return {
      evenCount,
      oddCount,
      evenPercentage,
      oddPercentage,
      strongerSide,
      power,
      isReadyToTrade,
      consecutiveOpposites,
      recommendedTrade,
    }
  }

  private countConsecutiveOpposites(digits: number[], strongerSide: "EVEN" | "ODD"): number {
    if (digits.length < 2) return 0

    const oppositeSide = strongerSide === "EVEN" ? "ODD" : "EVEN"
    let consecutiveCount = 0
    let maxConsecutive = 0

    for (let i = digits.length - 1; i >= 0; i--) {
      const isOpposite = oppositeSide === "EVEN" ? digits[i] % 2 === 0 : digits[i] % 2 !== 0

      if (isOpposite) {
        consecutiveCount++
        maxConsecutive = Math.max(maxConsecutive, consecutiveCount)
      } else {
        consecutiveCount = 0
      }
    }

    return maxConsecutive
  }

  setPowerThreshold(threshold: number) {
    this.powerThreshold = Math.max(50, Math.min(100, threshold))
  }

  getPowerThreshold(): number {
    return this.powerThreshold
  }
}
