"use client"

// Provides continuous digit frequency, bias strength, and market power calculations

import { useEffect, useState, useRef, useCallback } from "react"
import { MarketDataService, type DigitAnalysis } from "@/lib/market-data-service"

export interface AnalysisState {
  digitFrequencies: Record<number, DigitAnalysis>
  overUnderAnalysis: { over: number; under: number; total: number }
  marketPower: number
  biasDirection: "OVER" | "UNDER"
  biasStrength: number
  currentPrice: number | null
  lastDigits: number[]
  isAnalyzing: boolean
}

export function useMarketAnalysis(symbol = "R_100") {
  const [analysis, setAnalysis] = useState<AnalysisState>({
    digitFrequencies: {},
    overUnderAnalysis: { over: 0, under: 0, total: 0 },
    marketPower: 50,
    biasDirection: "OVER",
    biasStrength: 50,
    currentPrice: null,
    lastDigits: [],
    isAnalyzing: false,
  })

  const serviceRef = useRef<MarketDataService | null>(null)
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const initializeService = async () => {
      if (typeof window === "undefined") return

      serviceRef.current = new MarketDataService()

      try {
        await serviceRef.current.connect(symbol)
        setAnalysis((prev) => ({ ...prev, isAnalyzing: true }))

        // Update analysis every 1 second
        updateIntervalRef.current = setInterval(() => {
          if (!serviceRef.current) return

          const digitFrequencies = serviceRef.current.getDigitFrequencies()
          const overUnderAnalysis = serviceRef.current.getOverUnderAnalysis()
          const marketPower = serviceRef.current.getMarketPower()
          const currentPrice = serviceRef.current.getCurrentPrice()
          const lastDigits = serviceRef.current.getLastDigits(20)

          const overStrength =
            overUnderAnalysis.total > 0 ? (overUnderAnalysis.over / overUnderAnalysis.total) * 100 : 50
          const underStrength = 100 - overStrength
          const biasDirection = overStrength > underStrength ? "OVER" : "UNDER"
          const biasStrength = Math.max(overStrength, underStrength)

          setAnalysis({
            digitFrequencies,
            overUnderAnalysis,
            marketPower,
            biasDirection,
            biasStrength,
            currentPrice,
            lastDigits,
            isAnalyzing: true,
          })
        }, 1000)
      } catch (error) {
        console.error("[useMarketAnalysis] Failed to connect:", error)
        setAnalysis((prev) => ({ ...prev, isAnalyzing: false }))
      }
    }

    initializeService()

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
      if (serviceRef.current) {
        serviceRef.current.disconnect()
      }
    }
  }, [symbol])

  const getAnalysisReady = useCallback(() => {
    return analysis.biasStrength >= 62 && analysis.overUnderAnalysis.total > 100
  }, [analysis])

  return {
    ...analysis,
    isReady: getAnalysisReady(),
    service: serviceRef.current,
  }
}
