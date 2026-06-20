// Signal generation from tick data
export interface TickData {
  quote: number
  epoch: number
}

export class TickBuffer {
  private ticks: TickData[] = []
  private maxSize: number

  constructor(maxSize = 12) {
    this.maxSize = maxSize
  }

  addTick(quote: number, epoch: number): void {
    this.ticks.push({ quote, epoch })
    if (this.ticks.length > this.maxSize) {
      this.ticks.shift()
    }
  }

  getTicks(): TickData[] {
    return [...this.ticks]
  }

  getLastDigit(): number {
    if (this.ticks.length === 0) return -1
    const lastQuote = this.ticks[this.ticks.length - 1].quote
    return Math.floor(lastQuote * 10) % 10
  }

  getMostFrequentDigit(): { digit: number; frequency: number } {
    const digitCounts = new Map<number, number>()

    for (const tick of this.ticks) {
      const digit = Math.floor(tick.quote * 10) % 10
      digitCounts.set(digit, (digitCounts.get(digit) || 0) + 1)
    }

    let maxDigit = 0
    let maxCount = 0

    for (const [digit, count] of digitCounts) {
      if (count > maxCount) {
        maxCount = count
        maxDigit = digit
      }
    }

    return { digit: maxDigit, frequency: maxCount / this.ticks.length }
  }

  getLeastFrequentDigit(): { digit: number; frequency: number } {
    const digitCounts = new Map<number, number>()

    for (let i = 0; i < 10; i++) {
      digitCounts.set(i, 0)
    }

    for (const tick of this.ticks) {
      const digit = Math.floor(tick.quote * 10) % 10
      digitCounts.set(digit, (digitCounts.get(digit) || 0) + 1)
    }

    let minDigit = 0
    let minCount = this.ticks.length + 1

    for (const [digit, count] of digitCounts) {
      if (count < minCount) {
        minCount = count
        minDigit = digit
      }
    }

    return { digit: minDigit, frequency: minCount / this.ticks.length }
  }

  getDigitDistribution(): Record<number, number> {
    const distribution: Record<number, number> = {}
    for (let i = 0; i < 10; i++) {
      distribution[i] = 0
    }

    for (const tick of this.ticks) {
      const digit = Math.floor(tick.quote * 10) % 10
      distribution[digit]++
    }

    // Convert to percentages
    const total = this.ticks.length
    for (let i = 0; i < 10; i++) {
      distribution[i] = total > 0 ? (distribution[i] / total) * 100 : 0
    }

    return distribution
  }

  clear(): void {
    this.ticks = []
  }

  size(): number {
    return this.ticks.length
  }
}
