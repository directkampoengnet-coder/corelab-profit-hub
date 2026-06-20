"use client"

import type { AnalysisResult } from "@/lib/analysis-engine"

export interface SignalStrengthLevel {
  level: "STRONG" | "WAIT" | "NEUTRAL"
  confidence: number
  reasoning: string
  entryPoint?: number | string
}

export class EvenOddSignalStrategy {
  static analyze(analysis: AnalysisResult, ticksAnalyzed: number): SignalStrengthLevel {
    const minTicksForAnalysis = 300 // ~5 minutes at 1 tick/second

    if (ticksAnalyzed < minTicksForAnalysis) {
      return {
        level: "NEUTRAL",
        confidence: 0,
        reasoning: `Analyzing market (${ticksAnalyzed}/${minTicksForAnalysis} ticks). Please wait for comprehensive analysis.`,
      }
    }

    const evenPercentage = analysis.evenPercentage || 0
    const oddPercentage = analysis.oddPercentage || 0
    const diff = Math.abs(evenPercentage - oddPercentage)

    if (diff >= 60 && (evenPercentage >= 60 || oddPercentage >= 60)) {
      return {
        level: "STRONG",
        confidence: diff,
        reasoning: `${evenPercentage >= 60 ? "EVEN" : "ODD"} dominates at ${Math.max(evenPercentage, oddPercentage).toFixed(1)}%. Strong signal detected.`,
        entryPoint: evenPercentage >= 60 ? "EVEN" : "ODD",
      }
    } else if (diff >= 55 && (evenPercentage >= 55 || oddPercentage >= 55)) {
      return {
        level: "WAIT",
        confidence: diff,
        reasoning: `${evenPercentage >= 55 ? "EVEN" : "ODD"} showing increasing bias at ${Math.max(evenPercentage, oddPercentage).toFixed(1)}%. Wait for confirmation.`,
        entryPoint: evenPercentage >= 55 ? "EVEN" : "ODD",
      }
    }

    return {
      level: "NEUTRAL",
      confidence: 0,
      reasoning: "Even/Odd ratio balanced. No clear signal. Continue monitoring.",
    }
  }
}

export class OverUnderSignalStrategy {
  static analyze(analysis: AnalysisResult, ticksAnalyzed: number): SignalStrengthLevel {
    const minTicksForAnalysis = 300 // ~5 minutes

    if (ticksAnalyzed < minTicksForAnalysis) {
      return {
        level: "NEUTRAL",
        confidence: 0,
        reasoning: `Analyzing market (${ticksAnalyzed}/${minTicksForAnalysis} ticks). Please wait for comprehensive analysis.`,
      }
    }

    const overPercentage = analysis.highPercentage || 0 // Digits 5-9
    const underPercentage = analysis.lowPercentage || 0 // Digits 0-4
    const diff = Math.abs(overPercentage - underPercentage)

    if (diff >= 60 && (overPercentage >= 60 || underPercentage >= 60)) {
      const favored = overPercentage >= 60 ? "OVER" : "UNDER"
      return {
        level: "STRONG",
        confidence: diff,
        reasoning: `${favored} (${Math.max(overPercentage, underPercentage).toFixed(1)}%) shows powerful market bias. HIGH SIGNAL - Trade with confidence.`,
        entryPoint: favored,
      }
    } else if (diff >= 56 && (overPercentage >= 56 || underPercentage >= 56)) {
      const favored = overPercentage >= 56 ? "OVER" : "UNDER"
      return {
        level: "STRONG",
        confidence: diff,
        reasoning: `${favored} (${Math.max(overPercentage, underPercentage).toFixed(1)}%) shows strong direction. Ready to trade.`,
        entryPoint: favored,
      }
    } else if (diff >= 53 && (overPercentage >= 53 || underPercentage >= 53)) {
      const favored = overPercentage >= 53 ? "OVER" : "UNDER"
      return {
        level: "WAIT",
        confidence: diff,
        reasoning: `${favored} (${Math.max(overPercentage, underPercentage).toFixed(1)}%) showing increasing bias. Wait for confirmation to 56%+.`,
        entryPoint: favored,
      }
    }

    return {
      level: "NEUTRAL",
      confidence: 0,
      reasoning: "Over/Under balanced. Waiting for market direction clarity.",
    }
  }

  static getPredictedDigits(
    analysis: AnalysisResult,
    direction: "OVER" | "UNDER",
  ): {
    digits: number[]
    reasoning: string
  } {
    const sortedByFreq = [...analysis.digitFrequencies].sort((a, b) => b.count - a.count)
    const topDigits = sortedByFreq.slice(0, 5).map((d) => d.digit)

    if (direction === "OVER") {
      const overDigits = topDigits.filter((d) => d >= 5)
      return {
        digits: overDigits.slice(0, 3),
        reasoning: `Most frequent OVER digits: ${overDigits.join(", ")}. Entry when these appear.`,
      }
    } else {
      const underDigits = topDigits.filter((d) => d < 5)
      return {
        digits: underDigits.slice(0, 3),
        reasoning: `Most frequent UNDER digits: ${underDigits.join(", ")}. Entry when these appear.`,
      }
    }
  }
}

export class DiffersSignalStrategy {
  static analyze(analysis: AnalysisResult, recentDigits: number[]): SignalStrengthLevel {
    const minTicksForAnalysis = 50

    if (recentDigits.length < minTicksForAnalysis) {
      return {
        level: "NEUTRAL",
        confidence: 0,
        reasoning: `Analyzing market (${recentDigits.length}/${minTicksForAnalysis} ticks). Please wait.`,
      }
    }

    // Find digits with <10.5% frequency
    const weakDigits = analysis.digitFrequencies.filter((d) => d.percentage < 10.5)

    if (weakDigits.length === 0) {
      return {
        level: "NEUTRAL",
        confidence: 0,
        reasoning: "All digits have sufficient frequency (>10.5%). No differ signal.",
      }
    }

    // Check if weakest digit is decreasing in recent ticks
    const weakestDigit = weakDigits[0]
    const recentCount = recentDigits.filter((d) => d === weakestDigit.digit).length
    const recentPercentage = (recentCount / recentDigits.length) * 100

    if (recentPercentage < weakestDigit.percentage) {
      return {
        level: "STRONG",
        confidence: 100 - weakestDigit.percentage,
        reasoning: `Digit ${weakestDigit.digit} is RARELY appearing (${weakestDigit.percentage.toFixed(1)}%) and DECREASING. Strong DIFFERS signal.`,
        entryPoint: weakestDigit.digit,
      }
    }

    return {
      level: "WAIT",
      confidence: 50,
      reasoning: `Digit ${weakestDigit.digit} is weak (${weakestDigit.percentage.toFixed(1)}%) but not yet decreasing. Monitor for stronger signal.`,
      entryPoint: weakestDigit.digit,
    }
  }
}

export class MarketChangeAlertStrategy {
  static detectMarketChange(
    previousAnalysis: AnalysisResult | null,
    currentAnalysis: AnalysisResult,
  ): {
    hasChanged: boolean
    severity: "CRITICAL" | "WARNING" | "NONE"
    reasoning: string
  } {
    if (!previousAnalysis) {
      return {
        hasChanged: false,
        severity: "NONE",
        reasoning: "No previous data for comparison.",
      }
    }

    const evenDiff = Math.abs(currentAnalysis.evenPercentage - previousAnalysis.evenPercentage)
    const overDiff = Math.abs(currentAnalysis.highPercentage - previousAnalysis.highPercentage)

    const evenWasStrong = previousAnalysis.evenPercentage >= 55
    const evenIsWeak = currentAnalysis.evenPercentage < 50
    const evenFlipped = evenWasStrong && evenIsWeak

    const overWasStrong = previousAnalysis.highPercentage >= 55
    const overIsWeak = currentAnalysis.highPercentage < 50
    const overFlipped = overWasStrong && overIsWeak

    if (evenFlipped || overFlipped || evenDiff >= 15 || overDiff >= 15) {
      return {
        hasChanged: true,
        severity: "CRITICAL",
        reasoning: "🚨 MARKET CHANGING - Stop trading immediately and reassess signals.",
      }
    } else if (evenDiff >= 8 || overDiff >= 8) {
      return {
        hasChanged: true,
        severity: "WARNING",
        reasoning: "⚠️ Market showing volatility - Exercise caution with new trades.",
      }
    }

    return {
      hasChanged: false,
      severity: "NONE",
      reasoning: "Market stable. Conditions unchanged.",
    }
  }
}
