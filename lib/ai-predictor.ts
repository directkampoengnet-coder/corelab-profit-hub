"use client"

// AI Predictor using pattern analysis (simplified approach for browser)
// Note: Full LSTM would require training data and significant computation
// This implementation uses statistical patterns and frequency analysis

export interface PredictionResult {
  predictions: { digit: number; probability: number }[]
  topPrediction: { digit: number; confidence: number }
  secondPrediction: { digit: number; confidence: number }
  explanation: string
}

export class AIPredictor {
  private sequenceLength = 10

  predict(lastDigits: number[], digitFrequencies: Map<number, number>): PredictionResult {
    if (lastDigits.length < this.sequenceLength) {
      return this.getDefaultPrediction()
    }

    // Get recent sequence
    const recentSequence = lastDigits.slice(-this.sequenceLength)

    // Calculate predictions based on multiple factors
    const predictions = this.calculatePredictions(recentSequence, digitFrequencies, lastDigits.length)

    // Sort by probability
    const sortedPredictions = predictions.sort((a, b) => b.probability - a.probability)

    const topPrediction = sortedPredictions[0]
    const secondPrediction = sortedPredictions[1]

    const explanation = this.generateExplanation(topPrediction, secondPrediction, recentSequence)

    return {
      predictions: sortedPredictions,
      topPrediction: { digit: topPrediction.digit, confidence: topPrediction.probability },
      secondPrediction: { digit: secondPrediction.digit, confidence: secondPrediction.probability },
      explanation,
    }
  }

  private calculatePredictions(
    recentSequence: number[],
    digitFrequencies: Map<number, number>,
    totalTicks: number,
  ): { digit: number; probability: number }[] {
    const predictions: { digit: number; probability: number }[] = []

    for (let digit = 0; digit <= 9; digit++) {
      let score = 0

      // Factor 1: Overall frequency (30% weight)
      const frequency = (digitFrequencies.get(digit) || 0) / totalTicks
      score += frequency * 0.3

      // Factor 2: Recent appearance (25% weight)
      const recentAppearances = recentSequence.filter((d) => d === digit).length
      score += (recentAppearances / this.sequenceLength) * 0.25

      // Factor 3: Pattern continuation (20% weight)
      // Check if digit follows common patterns
      const lastDigit = recentSequence[recentSequence.length - 1]
      const transitionScore = this.calculateTransitionProbability(lastDigit, digit, recentSequence)
      score += transitionScore * 0.2

      // Factor 4: Absence penalty (15% weight)
      // Digits that haven't appeared recently are more likely
      const lastAppearance = this.getLastAppearanceIndex(digit, recentSequence)
      const absenceBonus = lastAppearance === -1 ? 0.15 : (lastAppearance / this.sequenceLength) * 0.15
      score += absenceBonus

      // Factor 5: Randomness factor (10% weight)
      // Add slight randomness to simulate unpredictability
      score += Math.random() * 0.1

      predictions.push({
        digit,
        probability: Math.min(score * 100, 100),
      })
    }

    // Normalize probabilities to sum to 100%
    const totalProb = predictions.reduce((sum, p) => sum + p.probability, 0)
    return predictions.map((p) => ({
      ...p,
      probability: (p.probability / totalProb) * 100,
    }))
  }

  private calculateTransitionProbability(fromDigit: number, toDigit: number, sequence: number[]): number {
    // Count how often fromDigit is followed by toDigit in the sequence
    let transitions = 0
    let totalFromDigit = 0

    for (let i = 0; i < sequence.length - 1; i++) {
      if (sequence[i] === fromDigit) {
        totalFromDigit++
        if (sequence[i + 1] === toDigit) {
          transitions++
        }
      }
    }

    return totalFromDigit > 0 ? transitions / totalFromDigit : 0.1
  }

  private getLastAppearanceIndex(digit: number, sequence: number[]): number {
    for (let i = sequence.length - 1; i >= 0; i--) {
      if (sequence[i] === digit) {
        return sequence.length - 1 - i
      }
    }
    return -1
  }

  private generateExplanation(
    topPrediction: { digit: number; probability: number },
    secondPrediction: { digit: number; probability: number },
    recentSequence: number[],
  ): string {
    const reasons: string[] = []

    // Check for streaks
    const lastDigit = recentSequence[recentSequence.length - 1]
    const streak = this.countStreak(lastDigit, recentSequence)

    if (streak >= 2) {
      reasons.push(`Recent streak of ${streak}x digit ${lastDigit}`)
    }

    // Check for absence
    const topAbsence = this.getLastAppearanceIndex(topPrediction.digit, recentSequence)
    if (topAbsence > 5 || topAbsence === -1) {
      reasons.push(`Digit ${topPrediction.digit} hasn't appeared recently`)
    }

    // Check for frequency
    const topCount = recentSequence.filter((d) => d === topPrediction.digit).length
    if (topCount >= 3) {
      reasons.push(`Digit ${topPrediction.digit} has high recent frequency`)
    }

    // Default explanation
    if (reasons.length === 0) {
      reasons.push("Based on statistical pattern analysis")
    }

    return `Model favors digit ${topPrediction.digit} at ${topPrediction.probability.toFixed(1)}% confidence. ${reasons.join(". ")}.`
  }

  private countStreak(digit: number, sequence: number[]): number {
    let streak = 0
    for (let i = sequence.length - 1; i >= 0; i--) {
      if (sequence[i] === digit) {
        streak++
      } else {
        break
      }
    }
    return streak
  }

  private getDefaultPrediction(): PredictionResult {
    const predictions = Array.from({ length: 10 }, (_, i) => ({
      digit: i,
      probability: 10,
    }))

    return {
      predictions,
      topPrediction: { digit: 0, confidence: 10 },
      secondPrediction: { digit: 1, confidence: 10 },
      explanation: "Insufficient data for prediction. Collecting more ticks...",
    }
  }
}
