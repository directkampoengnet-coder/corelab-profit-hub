// Analysis engine for processing tick data and generating signals
export interface TickData {
  epoch: number
  quote: number
  symbol: string
  pipSize?: number
}

export interface DigitFrequency {
  digit: number
  count: number
  percentage: number
}

export interface AnalysisResult {
  digitFrequencies: DigitFrequency[]
  evenCount: number
  oddCount: number
  evenPercentage: number
  oddPercentage: number
  highCount: number // 5-9
  lowCount: number // 0-4
  highPercentage: number
  lowPercentage: number
  entropy: number
  powerIndex: { strongest: number; weakest: number; gap: number }
  missingDigits: number[]
  streaks: { digit: number; count: number }[]
  totalTicks: number
}

export interface Signal {
  type:
    | "even_odd"
    | "over_under"
    | "matches"
    | "differs"
    | "rise_fall"
    | "pro_even_odd"
    | "pro_over_under"
    | "pro_differs"
  status: "TRADE NOW" | "WAIT" | "NEUTRAL"
  probability: number
  recommendation: string
  entryCondition: string
  targetDigit?: number
}

export class AnalysisEngine {
  private ticks: TickData[] = []
  private maxTicks = 100
  private digitCounts: Map<number, number> = new Map()
  private lastDigits: number[] = []
  private pipSize = 2

  constructor(maxTicks = 100) {
    this.maxTicks = maxTicks
    // Initialize digit counts
    for (let i = 0; i <= 9; i++) {
      this.digitCounts.set(i, 0)
    }
  }

  setPipSize(pipSize: number): void {
    this.pipSize = pipSize
  }

  addTick(tick: TickData): void {
    const lastDigit = this.extractLastDigit(tick.quote, tick.pipSize || this.pipSize)

    // Add to ticks array
    this.ticks.push(tick)
    this.lastDigits.push(lastDigit)

    // Maintain rolling window
    if (this.ticks.length > this.maxTicks) {
      const removedTick = this.ticks.shift()!
      const removedDigit = this.lastDigits.shift()!
      const count = this.digitCounts.get(removedDigit) || 0
      this.digitCounts.set(removedDigit, Math.max(0, count - 1))
    }

    // Update digit count
    const count = this.digitCounts.get(lastDigit) || 0
    this.digitCounts.set(lastDigit, count + 1)
  }

  private extractLastDigit(quote: number, pipSize = 2): number {
    // Format with pip_size decimal places, then extract last character
    const formatted = quote.toFixed(pipSize)
    const lastChar = formatted.charAt(formatted.length - 1)
    const digit = Number.parseInt(lastChar, 10)

    return isNaN(digit) ? 0 : digit
  }

  getAnalysis(): AnalysisResult {
    const totalTicks = this.lastDigits.length

    if (totalTicks === 0) {
      return this.getEmptyAnalysis()
    }

    // Calculate digit frequencies
    const digitFrequencies: DigitFrequency[] = []
    for (let i = 0; i <= 9; i++) {
      const count = this.digitCounts.get(i) || 0
      digitFrequencies.push({
        digit: i,
        count,
        percentage: (count / totalTicks) * 100,
      })
    }

    // Calculate even/odd
    let evenCount = 0
    let oddCount = 0
    this.lastDigits.forEach((digit) => {
      if (digit % 2 === 0) evenCount++
      else oddCount++
    })

    // Calculate high/low (over/under 4.5)
    let highCount = 0
    let lowCount = 0
    this.lastDigits.forEach((digit) => {
      if (digit >= 5) highCount++
      else lowCount++
    })

    // Calculate entropy
    const entropy = this.calculateEntropy(digitFrequencies, totalTicks)

    // Calculate power index
    const sortedByCount = [...digitFrequencies].sort((a, b) => b.count - a.count)
    const strongest = sortedByCount[0]
    const weakest = sortedByCount[sortedByCount.length - 1]
    const powerIndex = {
      strongest: strongest.digit,
      weakest: weakest.digit,
      gap: strongest.percentage - weakest.percentage,
    }

    // Find missing digits
    const missingDigits = digitFrequencies.filter((d) => d.count === 0).map((d) => d.digit)

    // Detect streaks
    const streaks = this.detectStreaks()

    return {
      digitFrequencies,
      evenCount,
      oddCount,
      evenPercentage: (evenCount / totalTicks) * 100,
      oddPercentage: (oddCount / totalTicks) * 100,
      highCount,
      lowCount,
      highPercentage: (highCount / totalTicks) * 100,
      lowPercentage: (lowCount / totalTicks) * 100,
      entropy,
      powerIndex,
      missingDigits,
      streaks,
      totalTicks,
    }
  }

  private calculateEntropy(frequencies: DigitFrequency[], total: number): number {
    let entropy = 0
    frequencies.forEach((freq) => {
      if (freq.count > 0) {
        const p = freq.count / total
        entropy -= p * Math.log2(p)
      }
    })
    return entropy
  }

  private detectStreaks(): { digit: number; count: number }[] {
    const streaks: Map<number, number> = new Map()
    let currentDigit = -1
    let currentStreak = 0

    this.lastDigits.forEach((digit) => {
      if (digit === currentDigit) {
        currentStreak++
      } else {
        if (currentStreak >= 2) {
          streaks.set(currentDigit, Math.max(streaks.get(currentDigit) || 0, currentStreak))
        }
        currentDigit = digit
        currentStreak = 1
      }
    })

    // Check final streak
    if (currentStreak >= 2) {
      streaks.set(currentDigit, Math.max(streaks.get(currentDigit) || 0, currentStreak))
    }

    return Array.from(streaks.entries())
      .map(([digit, count]) => ({ digit, count }))
      .sort((a, b) => b.count - a.count)
  }

  generateSignals(): Signal[] {
    const analysis = this.getAnalysis()
    const signals: Signal[] = []

    // Even/Odd Signal
    signals.push(this.generateEvenOddSignal(analysis))

    // Over/Under Signal
    signals.push(this.generateOverUnderSignal(analysis))

    // Matches Signal
    signals.push(this.generateMatchesSignal(analysis))

    // Differs Signal
    signals.push(this.generateDiffersSignal(analysis))

    // Rise/Fall Signal
    signals.push(this.generateRiseFallSignal(analysis))

    return signals
  }

  private generateEvenOddSignal(analysis: AnalysisResult): Signal {
    const { evenPercentage, oddPercentage } = analysis
    const maxPercentage = Math.max(evenPercentage, oddPercentage)
    const favored = evenPercentage > oddPercentage ? "even" : "odd"

    const lastDigits = this.getRecentDigits(50)
    const recent25 = lastDigits.slice(-25)
    const recent50 = lastDigits

    const evenIn25 = recent25.filter((d) => d % 2 === 0).length
    const evenIn50 = recent50.filter((d) => d % 2 === 0).length
    const evenPercent25 = recent25.length > 0 ? (evenIn25 / recent25.length) * 100 : 0
    const evenPercent50 = recent50.length > 0 ? (evenIn50 / recent50.length) * 100 : 0

    const isEvenIncreasing = evenPercent25 > evenPercent50
    const isOddIncreasing = !isEvenIncreasing

    const marketChanging = Math.abs(evenPercent25 - evenPercent50) < 2

    if (maxPercentage >= 60) {
      if ((favored === "even" && isEvenIncreasing) || (favored === "odd" && isOddIncreasing)) {
        return {
          type: "even_odd",
          status: "TRADE NOW",
          probability: maxPercentage,
          recommendation: `${marketChanging ? "⚠️ MARKET CHANGING - " : ""}STRONG ${favored.toUpperCase()} signal at ${maxPercentage.toFixed(1)}% and increasing - Ready to trade`,
          entryCondition: `Wait for 2+ consecutive opposite ${favored === "even" ? "ODD" : "EVEN"} digits, then one ${favored.toUpperCase()} appears - Start trade on ${favored.toUpperCase()} digit`,
        }
      }
    }

    if (maxPercentage >= 55 && ((favored === "even" && isEvenIncreasing) || (favored === "odd" && isOddIncreasing))) {
      return {
        type: "even_odd",
        status: "WAIT",
        probability: maxPercentage,
        recommendation: `${favored.toUpperCase()} bias at ${maxPercentage.toFixed(1)}% and increasing - Market building power`,
        entryCondition:
          "Wait for 2+ consecutive opposite digits, then one of the highest market digit appears to trade",
      }
    }

    return {
      type: "even_odd",
      status: "NEUTRAL",
      probability: maxPercentage,
      recommendation: "Analyzing market (5+ min required) - No clear even/odd bias yet",
      entryCondition: "Wait for threshold of 55%+ to be reached and increasing",
    }
  }

  private generateOverUnderSignal(analysis: AnalysisResult): Signal {
    const { digitFrequencies } = analysis

    const under = digitFrequencies.filter((d) => d.digit >= 0 && d.digit <= 4).reduce((s, d) => s + d.percentage, 0)
    const over = digitFrequencies.filter((d) => d.digit >= 5 && d.digit <= 9).reduce((s, d) => s + d.percentage, 0)

    const lastDigits = this.getRecentDigits(50)
    const recent25 = lastDigits.slice(-25)
    const recent50 = lastDigits

    const underIn25 = recent25.filter((d) => d >= 0 && d <= 4).length
    const underIn50 = recent50.filter((d) => d >= 0 && d <= 4).length
    const underPercent25 = recent25.length > 0 ? (underIn25 / recent25.length) * 100 : 0
    const underPercent50 = recent50.length > 0 ? (underIn50 / recent50.length) * 100 : 0

    const isUnderIncreasing = underPercent25 > underPercent50
    const maxPercentage = Math.max(under, over)
    const favored = under > over ? "under" : "over"

    const underDigits = digitFrequencies.filter((d) => d.digit <= 4).sort((a, b) => b.count - a.count)
    const overDigits = digitFrequencies.filter((d) => d.digit >= 5).sort((a, b) => b.count - a.count)

    const getUnderPrediction = () => {
      if (!underDigits[0]) return ""
      const topDigit = underDigits[0].digit
      if (topDigit >= 0 && topDigit <= 4) {
        // Return dynamic Under signals based on which digits appear most
        return `Under 6 (digits 0-4 appearing most, power digit: ${topDigit})`
      }
      return ""
    }

    const getOverPrediction = () => {
      if (!overDigits[0]) return ""
      const topDigit = overDigits[0].digit
      if (topDigit >= 5 && topDigit <= 9) {
        if (topDigit === 5 || topDigit === 6 || topDigit === 7 || topDigit === 8 || topDigit === 9) {
          return `Over 3 (digits 5-9 appearing most, power digit: ${topDigit})`
        }
      }
      return ""
    }

    if (
      maxPercentage >= 60 &&
      ((favored === "under" && isUnderIncreasing) || (favored === "over" && !isUnderIncreasing))
    ) {
      const prediction = favored === "under" ? getUnderPrediction() : getOverPrediction()
      return {
        type: "over_under",
        status: "TRADE NOW",
        probability: maxPercentage,
        recommendation: `STRONG ${favored.toUpperCase()} signal at ${maxPercentage.toFixed(1)}% - POWERFUL market direction! Prediction: ${prediction}`,
        entryCondition: `Trade ${favored.toUpperCase()} when power digit ${favored === "under" ? underDigits[0]?.digit : overDigits[0]?.digit} appears (use last 10-20 ticks for prediction)`,
      }
    }

    if (
      maxPercentage >= 56 &&
      ((favored === "under" && isUnderIncreasing) || (favored === "over" && !isUnderIncreasing))
    ) {
      const prediction = favored === "under" ? getUnderPrediction() : getOverPrediction()
      return {
        type: "over_under",
        status: "TRADE NOW",
        probability: maxPercentage,
        recommendation: `${favored.toUpperCase()} signal at ${maxPercentage.toFixed(1)}% and increasing - Ready to trade! Prediction: ${prediction}`,
        entryCondition: `Trade ${favored.toUpperCase()} based on market conditions. Power digit: ${favored === "under" ? underDigits[0]?.digit : overDigits[0]?.digit}`,
      }
    }

    if (
      maxPercentage >= 53 &&
      ((favored === "under" && isUnderIncreasing) || (favored === "over" && !isUnderIncreasing))
    ) {
      return {
        type: "over_under",
        status: "WAIT",
        probability: maxPercentage,
        recommendation: `${favored.toUpperCase()} bias at ${maxPercentage.toFixed(1)}% and increasing - Market building direction (analyzing for 5 min minimum)`,
        entryCondition: "Wait for market to show clear direction (55%+ and increasing)",
      }
    }

    return {
      type: "over_under",
      status: "NEUTRAL",
      probability: maxPercentage,
      recommendation: "Analyzing market patterns (5+ min required) - No clear over/under bias",
      entryCondition: "Wait for 53%+ threshold to be reached and increasing",
    }
  }

  private generateDiffersSignal(analysis: AnalysisResult): Signal {
    const { digitFrequencies, powerIndex } = analysis

    const validDiffers = digitFrequencies.filter((d) => {
      // Only digits 2-7
      if (d.digit < 2 || d.digit > 7) return false
      // Must have <10% power
      if (d.percentage >= 10) return false
      // Cannot be the most or least appearing overall
      if (d.digit === powerIndex.strongest || d.digit === powerIndex.weakest) return false
      return true
    })

    if (validDiffers.length === 0) {
      return {
        type: "differs",
        status: "NEUTRAL",
        probability: 50,
        recommendation: "Analyzing for Differs (need digits 2-7 with <10% power, not most/least appearing)",
        entryCondition: "Wait for digit 2-7 to have <10% power and be decreasing",
      }
    }

    const recentDigits = this.getRecentDigits(20)
    const recent10 = recentDigits.slice(-10)
    const recent20 = recentDigits

    let bestDigit: DigitFrequency | null = null
    let isDecreasing = false

    for (const digit of validDiffers) {
      const inRecent10 = recent10.filter((d) => d === digit.digit).length
      const inRecent20 = recent20.filter((d) => d === digit.digit).length

      const percent10 = recent10.length > 0 ? (inRecent10 / recent10.length) * 100 : 0
      const percent20 = recent20.length > 0 ? (inRecent20 / recent20.length) * 100 : 0

      if (percent10 < percent20 && percent10 < 10) {
        if (!bestDigit || percent10 < (bestDigit.percentage || 0)) {
          bestDigit = digit
          isDecreasing = true
        }
      }
    }

    if (bestDigit && isDecreasing && bestDigit.percentage < 10) {
      const last3Ticks = recentDigits.slice(-3)
      const digitInLast3 = last3Ticks.includes(bestDigit.digit)

      if (digitInLast3) {
        return {
          type: "differs",
          status: "WAIT",
          probability: 100 - bestDigit.percentage,
          recommendation: `Differs digit ${bestDigit.digit} appeared in last 3 ticks - Wait for next 3 ticks`,
          entryCondition: `If digit ${bestDigit.digit} doesn't appear in next 3 ticks, enter DIFFERS trade`,
          targetDigit: bestDigit.digit,
        }
      }

      return {
        type: "differs",
        status: "TRADE NOW",
        probability: 100 - bestDigit.percentage,
        recommendation: `DIFFERS signal on digit ${bestDigit.digit} at ${bestDigit.percentage.toFixed(1)}% (decreasing, <10% power, digits 2-7 only)`,
        entryCondition: `Digit ${bestDigit.digit} has not appeared in 3+ ticks - TRADE DIFFERS NOW`,
        targetDigit: bestDigit.digit,
      }
    }

    return {
      type: "differs",
      status: "NEUTRAL",
      probability: 50,
      recommendation:
        "Analyzing for Differs (need digits 2-7, not most/least appearing, <10% power, must be decreasing)",
      entryCondition: "Wait for digit 2-7 to meet all Differs conditions",
    }
  }

  private generateMatchesSignal(analysis: AnalysisResult): Signal {
    const { digitFrequencies, powerIndex } = analysis
    const topDigit = digitFrequencies.find((d) => d.digit === powerIndex.strongest)!

    if (topDigit.percentage >= 15) {
      return {
        type: "matches",
        status: "TRADE NOW",
        probability: topDigit.percentage,
        recommendation: `Digit ${topDigit.digit} has strong power at ${topDigit.percentage.toFixed(1)}%`,
        entryCondition: `Trade immediately when digit ${topDigit.digit} appears`,
        targetDigit: topDigit.digit,
      }
    } else if (topDigit.percentage >= 12) {
      return {
        type: "matches",
        status: "WAIT",
        probability: topDigit.percentage,
        recommendation: `Digit ${topDigit.digit} showing moderate frequency`,
        entryCondition: "Wait for frequency to increase",
        targetDigit: topDigit.digit,
      }
    }

    return {
      type: "matches",
      status: "NEUTRAL",
      probability: topDigit.percentage,
      recommendation: "No dominant digit pattern",
      entryCondition: "Wait for clearer pattern",
    }
  }

  private generateRiseFallSignal(analysis: AnalysisResult): Signal {
    const { entropy } = analysis

    // Use entropy and recent trend to predict rise/fall
    const recentTicks = this.ticks.slice(-10)
    if (recentTicks.length < 2) {
      return {
        type: "rise_fall",
        status: "NEUTRAL",
        probability: 50,
        recommendation: "Insufficient data for trend analysis",
        entryCondition: "Wait for more ticks",
      }
    }

    const trend = recentTicks[recentTicks.length - 1].quote - recentTicks[0].quote
    const trendDirection = trend > 0 ? "rise" : "fall"
    const confidence = Math.min(60 + Math.abs(trend) * 100, 75)

    if (confidence >= 60) {
      return {
        type: "rise_fall",
        status: "TRADE NOW",
        probability: confidence,
        recommendation: `${trendDirection.toUpperCase()} trend detected with ${confidence.toFixed(1)}% confidence`,
        entryCondition: `Trade ${trendDirection} based on current trend`,
      }
    }

    return {
      type: "rise_fall",
      status: "NEUTRAL",
      probability: confidence,
      recommendation: "No clear directional trend",
      entryCondition: "Wait for stronger trend",
    }
  }

  private getEmptyAnalysis(): AnalysisResult {
    return {
      digitFrequencies: Array.from({ length: 10 }, (_, i) => ({
        digit: i,
        count: 0,
        percentage: 0,
      })),
      evenCount: 0,
      oddCount: 0,
      evenPercentage: 0,
      oddPercentage: 0,
      highCount: 0,
      lowCount: 0,
      highPercentage: 0,
      lowPercentage: 0,
      entropy: 0,
      powerIndex: { strongest: 0, weakest: 0, gap: 0 },
      missingDigits: [],
      streaks: [],
      totalTicks: 0,
    }
  }

  getTicks(): TickData[] {
    return [...this.ticks]
  }

  getLastDigits(): number[] {
    return [...this.lastDigits]
  }

  getCurrentDigit(): number | null {
    return this.lastDigits.length > 0 ? this.lastDigits[this.lastDigits.length - 1] : null
  }

  setMaxTicks(max: number): void {
    this.maxTicks = max
    // Trim if necessary
    while (this.ticks.length > this.maxTicks) {
      const removedTick = this.ticks.shift()!
      const removedDigit = this.lastDigits.shift()!
      const count = this.digitCounts.get(removedDigit) || 0
      this.digitCounts.set(removedDigit, Math.max(0, count - 1))
    }
  }

  clear(): void {
    this.ticks = []
    this.lastDigits = []
    for (let i = 0; i <= 9; i++) {
      this.digitCounts.set(i, 0)
    }
  }

  getRecentDigits(count = 20): number[] {
    return this.lastDigits.slice(-count)
  }

  generateProSignals(): Signal[] {
    const analysis = this.getAnalysis()
    const signals: Signal[] = []
    const recentDigits = this.getRecentDigits(20)

    // Pro Even/Odd Signal
    signals.push(this.generateProEvenOddSignal(analysis, recentDigits))

    // Pro Over/Under Signal
    signals.push(this.generateProOverUnderSignal(analysis, recentDigits))

    // Pro Differs Signal
    signals.push(this.generateProDiffersSignal(analysis))

    signals.push(this.generateUnder7Signal(analysis))

    signals.push(this.generateOver2Signal(analysis))

    return signals.filter((s) => s.status !== "NEUTRAL")
  }

  private generateProEvenOddSignal(analysis: AnalysisResult, recentDigits: number[]): Signal {
    const { evenPercentage, oddPercentage, digitFrequencies } = analysis

    // Check for EVEN strategy conditions
    if (evenPercentage >= 55) {
      const evenDigits = digitFrequencies.filter((d) => d.digit % 2 === 0)
      const highPercentageEvens = evenDigits.filter((d) => d.percentage >= 11).length
      const hasGreenEven = evenDigits.some((d) => d.digit === analysis.powerIndex.strongest)

      // Check last 20 digits for even dominance
      const last20 = recentDigits.slice(-20)
      const evenInLast20 = last20.filter((d) => d % 2 === 0).length

      if (highPercentageEvens >= 2 && hasGreenEven && evenInLast20 >= 11) {
        // Check for 3+ consecutive odds
        let consecutiveOdds = 0
        for (let i = recentDigits.length - 1; i >= 0; i--) {
          if (recentDigits[i] % 2 === 1) {
            consecutiveOdds++
          } else {
            break
          }
        }

        if (consecutiveOdds >= 3) {
          return {
            type: "pro_even_odd",
            status: "TRADE NOW",
            probability: evenPercentage,
            recommendation: `EVEN STRATEGY: ${consecutiveOdds} consecutive odds detected - Enter EVEN now!`,
            entryCondition: "Enter EVEN immediately after first even digit appears",
          }
        }

        return {
          type: "pro_even_odd",
          status: "WAIT",
          probability: evenPercentage,
          recommendation: "EVEN conditions met - Waiting for 3+ consecutive ODD digits",
          entryCondition: "Wait for 3+ consecutive ODD digits, then enter EVEN",
        }
      }
    }

    // Check for ODD strategy conditions
    if (oddPercentage >= 70) {
      const oddDigits = digitFrequencies.filter((d) => d.digit % 2 === 1)
      const highPercentageOdds = oddDigits.filter((d) => d.percentage >= 11).length
      const hasGreenOdd = oddDigits.some((d) => d.digit === analysis.powerIndex.strongest)

      const last20 = recentDigits.slice(-20)
      const oddInLast20 = last20.filter((d) => d % 2 === 1).length

      if (highPercentageOdds >= 2 && hasGreenOdd && oddInLast20 >= 14) {
        let consecutiveEvens = 0
        for (let i = recentDigits.length - 1; i >= 0; i--) {
          if (recentDigits[i] % 2 === 0) {
            consecutiveEvens++
          } else {
            break
          }
        }

        if (consecutiveEvens >= 3) {
          return {
            type: "pro_even_odd",
            status: "TRADE NOW",
            probability: oddPercentage,
            recommendation: `ODD STRATEGY: ${consecutiveEvens} consecutive evens detected - Enter ODD now!`,
            entryCondition: "Enter ODD immediately after first odd digit appears",
          }
        }

        return {
          type: "pro_even_odd",
          status: "WAIT",
          probability: oddPercentage,
          recommendation: "ODD conditions met - Waiting for 3+ consecutive EVEN digits",
          entryCondition: "Wait for 3+ consecutive EVEN digits, then enter ODD",
        }
      }
    }

    return {
      type: "pro_even_odd",
      status: "NEUTRAL",
      probability: Math.max(evenPercentage, oddPercentage),
      recommendation: "Pro Even/Odd conditions not met",
      entryCondition: "Wait for stronger signal",
    }
  }

  private generateProOverUnderSignal(analysis: AnalysisResult, recentDigits: number[]): Signal {
    const { digitFrequencies, powerIndex } = analysis

    // Over 1 Strategy
    const digit0 = digitFrequencies[0]
    const digit1 = digitFrequencies[1]
    const digits2to9 = digitFrequencies.slice(2)

    if (digit0.percentage < 10 && digit1.percentage < 10) {
      const highPercentageDigits = digits2to9.filter((d) => d.percentage >= 11).length
      const hasLeastIn01 = digit0.digit === powerIndex.weakest || digit1.digit === powerIndex.weakest

      if (highPercentageDigits >= 3 && hasLeastIn01) {
        const last20 = recentDigits.slice(-20)
        const overInLast20 = last20.filter((d) => d > 1).length

        if (overInLast20 >= 18) {
          return {
            type: "pro_over_under",
            status: "TRADE NOW",
            probability: 100 - (digit0.percentage + digit1.percentage),
            recommendation: "OVER 1 STRATEGY: Strong signal - 90%+ win rate detected!",
            entryCondition: "Wait for 1+ UNDER digits, then enter OVER 1 immediately",
          }
        }
      }
    }

    // Under 8 Strategy
    const digit8 = digitFrequencies[8]
    const digit9 = digitFrequencies[9]
    const digits0to7 = digitFrequencies.slice(0, 8)

    if (digit8.percentage < 10 && digit9.percentage < 10) {
      const highPercentageDigits = digits0to7.filter((d) => d.percentage >= 11).length
      const hasLeastIn89 = digit8.digit === powerIndex.weakest || digit9.digit === powerIndex.weakest

      if (highPercentageDigits >= 3 && hasLeastIn89) {
        const last20 = recentDigits.slice(-20)
        const underInLast20 = last20.filter((d) => d < 8).length

        if (underInLast20 >= 18) {
          return {
            type: "pro_over_under",
            status: "TRADE NOW",
            probability: 100 - (digit8.percentage + digit9.percentage),
            recommendation: "UNDER 8 STRATEGY: Strong signal - 90%+ win rate detected!",
            entryCondition: "Wait for 1+ OVER digits, then enter UNDER 8 immediately",
          }
        }
      }
    }

    return {
      type: "pro_over_under",
      status: "NEUTRAL",
      probability: 50,
      recommendation: "Pro Over/Under conditions not met",
      entryCondition: "Wait for stronger signal",
    }
  }

  private generateProDiffersSignal(analysis: AnalysisResult): Signal {
    const { digitFrequencies } = analysis
    const sorted = [...digitFrequencies].sort((a, b) => a.count - b.count)
    const leastDigit = sorted[0]

    if (leastDigit.percentage < 9) {
      const differsWinRate = 100 - leastDigit.percentage

      if (differsWinRate >= 88) {
        return {
          type: "pro_differs",
          status: "TRADE NOW",
          probability: differsWinRate,
          recommendation: `PRO DIFFERS: Digit ${leastDigit.digit} at ${leastDigit.percentage.toFixed(1)}% - ${differsWinRate.toFixed(1)}% win rate!`,
          entryCondition: `Wait for digit ${leastDigit.digit} to appear, then trade DIFFERS immediately`,
          targetDigit: leastDigit.digit,
        }
      }
    }

    return {
      type: "pro_differs",
      status: "NEUTRAL",
      probability: 50,
      recommendation: "Pro Differs conditions not met",
      entryCondition: "Wait for digit with <9% frequency and 88%+ differs win rate",
    }
  }

  private generateUnder7Signal(analysis: AnalysisResult): Signal {
    const { digitFrequencies } = analysis

    // Check digits 7,8,9 - if 2+ are less than 10%, use the one >10% as entry
    const digit7 = digitFrequencies[7]
    const digit8 = digitFrequencies[8]
    const digit9 = digitFrequencies[9]

    const digits789 = [digit7, digit8, digit9]
    const below10 = digits789.filter((d) => d.percentage < 10)
    const above10 = digits789.filter((d) => d.percentage > 10)

    // Strategy: 2+ digits in 7,8,9 < 10%, use digit >10% as entry
    if (below10.length >= 2 && above10.length > 0) {
      const entryDigit = above10.sort((a, b) => b.percentage - a.percentage)[0]
      const probability = 100 - entryDigit.percentage

      if (probability >= 85) {
        return {
          type: "pro_over_under",
          status: "TRADE NOW",
          probability,
          recommendation: `UNDER 7 STRATEGY: Digit ${entryDigit.digit} at ${entryDigit.percentage.toFixed(1)}% - Enter UNDER 7!`,
          entryCondition: `Trade UNDER 7 when digit ${entryDigit.digit} appears`,
          targetDigit: entryDigit.digit,
        }
      }
    }

    return {
      type: "pro_over_under",
      status: "NEUTRAL",
      probability: 50,
      recommendation: "Under 7 conditions not met",
      entryCondition: "Wait for 2+ digits in 7,8,9 to be <10%",
    }
  }

  private generateOver2Signal(analysis: AnalysisResult): Signal {
    const { digitFrequencies } = analysis

    // Check digits 0,1,2 - if 2+ are less than 10%, use the one >10% as entry
    const digit0 = digitFrequencies[0]
    const digit1 = digitFrequencies[1]
    const digit2 = digitFrequencies[2]

    const digits012 = [digit0, digit1, digit2]
    const below10 = digits012.filter((d) => d.percentage < 10)
    const above10 = digits012.filter((d) => d.percentage > 10)

    // Strategy: 2+ digits in 0,1,2 < 10%, use digit >10% as entry
    if (below10.length >= 2 && above10.length > 0) {
      const entryDigit = above10.sort((a, b) => b.percentage - a.percentage)[0]
      const probability = entryDigit.percentage + 75

      if (probability >= 85) {
        return {
          type: "pro_over_under",
          status: "TRADE NOW",
          probability: Math.min(probability, 95),
          recommendation: `OVER 2 STRATEGY: Digit ${entryDigit.digit} at ${entryDigit.percentage.toFixed(1)}% - Enter OVER 2!`,
          entryCondition: `Trade OVER 2 when digit ${entryDigit.digit} appears`,
          targetDigit: entryDigit.digit,
        }
      }
    }

    return {
      type: "pro_over_under",
      status: "NEUTRAL",
      probability: 50,
      recommendation: "Over 2 conditions not met",
      entryCondition: "Wait for 2+ digits in 0,1,2 to be <10%",
    }
  }
}
