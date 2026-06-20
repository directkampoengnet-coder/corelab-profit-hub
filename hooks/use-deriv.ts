"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { DerivWebSocket, type DerivSymbol, type ConnectionLog } from "@/lib/deriv-websocket"
import { AnalysisEngine, type TickData, type AnalysisResult, type Signal } from "@/lib/analysis-engine"
import { AIPredictor, type PredictionResult } from "@/lib/ai-predictor"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { DERIV_CONFIG } from "@/lib/deriv-config"

export function useDeriv(initialSymbol = "R_100", initialMaxTicks = 100) {
  const { accounts, activeLoginId } = useDerivAuth()
  const activeAccount = accounts.find((acc) => acc.loginid === activeLoginId)

  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "reconnecting">(
    "reconnecting",
  )
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [currentDigit, setCurrentDigit] = useState<number | null>(null)
  const [tickCount, setTickCount] = useState(0)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [aiPrediction, setAiPrediction] = useState<PredictionResult | null>(null)
  const [symbol, setSymbol] = useState(initialSymbol)
  const [maxTicks, setMaxTicks] = useState(initialMaxTicks)
  const [availableSymbols, setAvailableSymbols] = useState<DerivSymbol[]>([])
  const [connectionLogs, setConnectionLogs] = useState<ConnectionLog[]>([])

  const wsRef = useRef<DerivWebSocket | null>(null)
  const engineRef = useRef<AnalysisEngine | null>(null)
  const predictorRef = useRef<AIPredictor | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const token = activeAccount?.token
    wsRef.current = new DerivWebSocket(DERIV_CONFIG.APP_ID, token)
    engineRef.current = new AnalysisEngine(maxTicks)
    predictorRef.current = new AIPredictor()

    const unsubscribeStatus = wsRef.current.onConnectionStatus((status) => {
      console.log("[v0] Connection status changed:", status)
      setConnectionStatus(status)
    })

    const unsubscribeTick = wsRef.current.subscribe("tick", (data) => {
      if (data.tick) {
        const tick: TickData = {
          epoch: data.tick.epoch,
          quote: data.tick.quote,
          symbol: data.tick.symbol,
          pipSize: data.tick.pip_size || 2,
        }

        if (data.tick.pip_size) {
          engineRef.current?.setPipSize(data.tick.pip_size)
        }

        engineRef.current?.addTick(tick)

        setCurrentPrice(tick.quote)
        setCurrentDigit(engineRef.current?.getCurrentDigit() || null)
        setTickCount((prev) => prev + 1)

        const newAnalysis = engineRef.current?.getAnalysis()
        const newSignals = engineRef.current?.generateSignals()

        if (newAnalysis) setAnalysis(newAnalysis)
        if (newSignals) setSignals(newSignals)

        if (predictorRef.current && engineRef.current && tickCount % 10 === 0) {
          const lastDigits = engineRef.current.getLastDigits()
          const digitCounts = new Map<number, number>()
          newAnalysis?.digitFrequencies.forEach((freq) => {
            digitCounts.set(freq.digit, freq.count)
          })
          const prediction = predictorRef.current.predict(lastDigits, digitCounts)
          setAiPrediction(prediction)
        }
      }
    })

    const unsubscribeSymbols = wsRef.current.subscribe("active_symbols", (data) => {
      if (data.active_symbols) {
        console.log("[v0] Received active symbols:", data.active_symbols.length)
        setAvailableSymbols(data.active_symbols)
      }
    })

    const unsubscribeLogs = wsRef.current.subscribe("connection_log", (log: ConnectionLog) => {
      setConnectionLogs((prev) => [...prev, log].slice(-100))
    })

    wsRef.current
      .connect()
      .then(() => {
        console.log("[v0] WebSocket connected, subscribing to ticks for:", symbol)
        wsRef.current?.subscribeTicks(symbol)
      })
      .catch((error) => {
        console.error("[v0] Failed to connect:", error)
        setConnectionStatus("disconnected")
      })

    return () => {
      unsubscribeStatus()
      unsubscribeTick()
      unsubscribeSymbols()
      unsubscribeLogs()
      wsRef.current?.disconnect()
    }
  }, [activeAccount?.token, maxTicks, symbol])

  const changeSymbol = useCallback((newSymbol: string) => {
    console.log("[v0] Changing symbol to:", newSymbol)
    if (wsRef.current?.isConnected()) {
      wsRef.current.unsubscribeTicks()
      wsRef.current.subscribeTicks(newSymbol)
      engineRef.current?.clear()
      setSymbol(newSymbol)
      setTickCount(0)
      setCurrentPrice(null)
      setCurrentDigit(null)
      setAnalysis(null)
      setSignals([])
      setAiPrediction(null)
    } else {
      console.log("[v0] Not connected, attempting to reconnect for symbol change")
      setSymbol(newSymbol)
      wsRef.current
        ?.connect()
        .then(() => {
          wsRef.current?.subscribeTicks(newSymbol)
        })
        .catch((error) => {
          console.error("[v0] Failed to reconnect:", error)
        })
    }
  }, [])

  const changeMaxTicks = useCallback((newMaxTicks: number) => {
    engineRef.current?.setMaxTicks(newMaxTicks)
    setMaxTicks(newMaxTicks)
  }, [])

  const exportData = useCallback(
    (format: "csv" | "json") => {
      const ticks = engineRef.current?.getTicks() || []
      const analysisData = engineRef.current?.getAnalysis()

      if (format === "json") {
        return JSON.stringify({ ticks, analysis: analysisData, signals }, null, 2)
      } else {
        let csv = "Epoch,Quote,Symbol,LastDigit\n"
        const lastDigits = engineRef.current?.getLastDigits() || []
        ticks.forEach((tick, index) => {
          csv += `${tick.epoch},${tick.quote},${tick.symbol},${lastDigits[index]}\n`
        })
        return csv
      }
    },
    [signals],
  )

  const getRecentDigits = useCallback((count = 20) => {
    return engineRef.current?.getRecentDigits(count) || []
  }, [])

  return {
    connectionStatus,
    currentPrice,
    currentDigit,
    tickCount,
    analysis,
    signals: signals || [],
    aiPrediction,
    symbol,
    maxTicks,
    availableSymbols,
    connectionLogs,
    changeSymbol,
    changeMaxTicks,
    exportData,
    getRecentDigits,
  }
}
