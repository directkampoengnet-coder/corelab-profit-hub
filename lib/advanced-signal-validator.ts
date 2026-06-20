"use client"

import type { AnalysisResult } from "@/lib/analysis-engine"

export interface SignalConsensus {
  overallSignal: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL"
  confidence: number // 0-100
  agreementCount: number // How many signals agree
  recommendedStrategy: string
  entryPoints: string[]
  riskLevel: "LOW" | "MEDIUM" | "HIGH"
  reasoning: string
  signals: {
    evenOdd: SignalResult
    overUnder: SignalResult
    differs: SignalResult
    momentum: SignalResult
  }
}

export interface SignalResult {
  name: string
  signal: "BUY" | "SELL" | "NEUTRAL"
  confidence: number
  strength: "STRONG" | "MODERATE" | "WEAK"
}

export class AdvancedSignalValidator {
  static analyzeConsensus(analysis: AnalysisResult, recentDigits: number[]): SignalConsensus {
    const signals = {
      evenOdd: this.analyzeEvenOddSignal(analysis),
      overUnder: this.analyzeOverUnderSignal(analysis),
      differs: this.analyzeDiffersSignal(analysis, recentDigits),
      momentum: this.analyzeMomentumSignal(recentDigits),
    }

    // Calculate consensus
    const buyVotes = Object.values(signals).filter((s) => s.signal === "BUY").length
    const sellVotes = Object.values(signals).filter((s) => s.signal === "SELL").length
    const totalSignals = Object.keys(signals).length

    // Determine overall signal and confidence
    const { overallSignal, confidence } = this.determineConsensus(
      buyVotes,
      sellVotes,
      totalSignals,
      Object.values(signals),
    )

    // Determine risk level
    const riskLevel = this.calculateRiskLevel(signals, analysis)

    // Get recommended strategy
    const recommendedStrategy = this.getRecommendedStrategy(signals, analysis)

    // Get entry points
    const entryPoints = this.getEntryPoints(signals, analysis)

    return {
      overallSignal,
      confidence,
      agreementCount: Math.max(buyVotes, sellVotes),
      recommendedStrategy,
      entryPoints,
      riskLevel,
      reasoning: this.generateReasoning(signals, buyVotes, sellVotes, analysis),
      signals,
    }
  }

  private static analyzeEvenOddSignal(analysis: AnalysisResult): SignalResult {
    const evenPercentage = analysis.evenPercentage || 0
    const oddPercentage = analysis.oddPercentage || 0
    const diff = Math.abs(evenPercentage - oddPercentage)

    if (diff >= 65) {
      return {
        name: "Even/Odd",
        signal: evenPercentage > oddPercentage ? "BUY" : "SELL",
        confidence: Math.min(diff, 100),
        strength: "STRONG",
      }
    } else if (diff >= 55) {
      return {
        name: "Even/Odd",
        signal: evenPercentage > oddPercentage ? "BUY" : "SELL",
        confidence: diff - 10,
        strength: "MODERATE",
      }
    }

    return {
      name: "Even/Odd",
      signal: "NEUTRAL",
      confidence: 0,
      strength: "WEAK",
    }
  }

  private static analyzeOverUnderSignal(analysis: AnalysisResult): SignalResult {
    const overPercentage = analysis.highPercentage || 0
    const underPercentage = analysis.lowPercentage || 0
    const diff = Math.abs(overPercentage - underPercentage)

    if (diff >= 65) {
      return {
        name: "Over/Under",
        signal: overPercentage > underPercentage ? "BUY" : "SELL",
        confidence: Math.min(diff, 100),
        strength: "STRONG",
      }
    } else if (diff >= 55) {
      return {
        name: "Over/Under",
        signal: overPercentage > underPercentage ? "BUY" : "SELL",
        confidence: diff - 10,
        strength: "MODERATE",
      }
    }

    return {
      name: "Over/Under",
      signal: "NEUTRAL",
      confidence: 0,
      strength: "WEAK",
    }
  }

  private static analyzeDiffersSignal(analysis: AnalysisResult, recentDigits: number[]): SignalResult {
    if (recentDigits.length < 50) {
      return {
        name: "Differs",
        signal: "NEUTRAL",
        confidence: 0,
        strength: "WEAK",
      }
    }

    const weakDigits = analysis.digitFrequencies.filter((d) => d.percentage < 9)

    if (weakDigits.length === 0) {
      return {
        name: "Differs",
        signal: "NEUTRAL",
        confidence: 0,
        strength: "WEAK",
      }
    }

    const weakestDigit = weakDigits[0]
    const recentCount = recentDigits.filter((d) => d === weakestDigit.digit).length
    const recentPercentage = (recentCount / recentDigits.length) * 100

    if (recentPercentage < weakestDigit.percentage - 2) {
      return {
        name: "Differs",
        signal: "BUY", // Trade the opposite
        confidence: Math.min(100 - weakestDigit.percentage, 100),
        strength: "STRONG",
      }
    }

    return {
      name: "Differs",
      signal: "NEUTRAL",
      confidence: 0,
      strength: "WEAK",
    }
  }

  private static analyzeMomentumSignal(recentDigits: number[]): SignalResult {
    if (recentDigits.length < 20) {
      return {
        name: "Momentum",
        signal: "NEUTRAL",
        confidence: 0,
        strength: "WEAK",
      }
    }

    const recent10 = recentDigits.slice(-10)
    const recent20 = recentDigits.slice(-20)

    const recentHigh = recent10.filter((d) => d >= 5).length
    const recentHighPercent = (recentHigh / 10) * 100

    const prevHighPercent = (recent20.filter((d) => d >= 5).length / 20) * 100

    const momentum = recentHighPercent - prevHighPercent

    if (momentum > 20) {
      return {
        name: "Momentum",
        signal: "BUY",
        confidence: Math.min(Math.abs(momentum), 50),
        strength: "MODERATE",
      }
    } else if (momentum < -20) {
      return {
        name: "Momentum",
        signal: "SELL",
        confidence: Math.min(Math.abs(momentum), 50),
        strength: "MODERATE",
      }
    }

    return {
      name: "Momentum",
      signal: "NEUTRAL",
      confidence: 0,
      strength: "WEAK",
    }
  }

  private static determineConsensus(
    buyVotes: number,
    sellVotes: number,
    totalSignals: number,
    signals: SignalResult[],
  ): {
    overallSignal: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL"
    confidence: number
  } {
    const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length || 0

    if (buyVotes >= 3 && avgConfidence >= 70) {
      return { overallSignal: "STRONG_BUY", confidence: Math.min(avgConfidence, 100) }
    } else if (buyVotes >= 2 && avgConfidence >= 50) {
      return { overallSignal: "BUY", confidence: avgConfidence }
    } else if (sellVotes >= 3 && avgConfidence >= 70) {
      return { overallSignal: "STRONG_SELL", confidence: Math.min(avgConfidence, 100) }
    } else if (sellVotes >= 2 && avgConfidence >= 50) {
      return { overallSignal: "SELL", confidence: avgConfidence }
    }

    return { overallSignal: "HOLD", confidence: avgConfidence }
  }

  private static calculateRiskLevel(
    signals: Record<string, SignalResult>,
    analysis: AnalysisResult,
  ): "LOW" | "MEDIUM" | "HIGH" {
    const strongCount = Object.values(signals).filter((s) => s.strength === "STRONG").length
    const entropy = analysis.entropy || 0

    // High entropy = high risk
    if (entropy > 3.2) return "HIGH"

    // Strong signal agreement = low risk
    if (strongCount >= 3) return "LOW"

    // Mixed signals = medium risk
    if (strongCount >= 2) return "MEDIUM"

    return "HIGH"
  }

  private static getRecommendedStrategy(signals: Record<string, SignalResult>, analysis: AnalysisResult): string {
    const strongSignals = Object.entries(signals)
      .filter(([_, s]) => s.strength === "STRONG")
      .map(([name, _]) => name)

    if (strongSignals.length >= 2) {
      return `Multi-Signal: ${strongSignals.join(" + ")} - High confidence trade`
    }

    if (signals.evenOdd.strength === "STRONG") {
      return "Even/Odd Pattern Trade"
    }

    if (signals.overUnder.strength === "STRONG") {
      return "Over/Under Pattern Trade"
    }

    if (signals.momentum.strength === "STRONG") {
      return "Momentum-Based Trade"
    }

    return "Scalping/Wait for Confirmation"
  }

  private static getEntryPoints(signals: Record<string, SignalResult>, analysis: AnalysisResult): string[] {
    const points: string[] = []

    if (signals.evenOdd.strength === "STRONG") {
      const side = signals.evenOdd.signal === "BUY" ? "EVEN" : "ODD"
      points.push(`${side} with ${signals.evenOdd.confidence.toFixed(0)}% confidence`)
    }

    if (signals.overUnder.strength === "STRONG") {
      const side = signals.overUnder.signal === "BUY" ? "OVER" : "UNDER"
      points.push(`${side} with ${signals.overUnder.confidence.toFixed(0)}% confidence`)
    }

    if (signals.momentum.strength === "STRONG") {
      const direction = signals.momentum.signal === "BUY" ? "Up" : "Down"
      points.push(`${direction} momentum detected`)
    }

    return points.length > 0 ? points : ["No clear entry points - Wait for confirmation"]
  }

  private static generateReasoning(
    signals: Record<string, SignalResult>,
    buyVotes: number,
    sellVotes: number,
    analysis: AnalysisResult,
  ): string {
    const agreingSignals = Object.entries(signals)
      .filter(([_, s]) => s.signal !== "NEUTRAL")
      .map(([name, s]) => `${name} (${s.confidence.toFixed(0)}%)`)

    if (buyVotes >= 3) {
      return `Strong multi-signal consensus for BUY: ${agreingSignals.join(" + ")}. Market shows consistent upside bias.`
    }

    if (sellVotes >= 3) {
      return `Strong multi-signal consensus for SELL: ${agreingSignals.join(" + ")}. Market shows consistent downside bias.`
    }

    if (buyVotes >= 2) {
      return `Moderate BUY signal: ${agreingSignals.join(" + ")}. Exercise caution with smaller position size.`
    }

    if (sellVotes >= 2) {
      return `Moderate SELL signal: ${agreingSignals.join(" + ")}. Exercise caution with smaller position size.`
    }

    return `Mixed signals detected: ${agreingSignals.join(" | ")}. Wait for market direction clarity.`
  }

  static getWinProbability(consensus: SignalConsensus): number {
    const baseWinRate = 50 // 50% base

    switch (consensus.overallSignal) {
      case "STRONG_BUY":
      case "STRONG_SELL":
        return Math.min(50 + consensus.confidence * 0.4, 85)
      case "BUY":
      case "SELL":
        return Math.min(50 + consensus.confidence * 0.25, 75)
      case "HOLD":
      default:
        return baseWinRate
    }
  }
}
