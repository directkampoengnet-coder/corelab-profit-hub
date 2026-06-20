"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { DerivWebSocketManager } from "@/lib/deriv-websocket-manager"
import { extractLastDigit } from "@/lib/deriv-markets"

interface MarketAnalysis {
  symbol: string
  displayName: string
  price: number
  lastDigit: number
  digits: number[]
  probability: number
  signal: "entry" | "exit" | "hold"
}

export function KillerOverUnderTab() {
  const { token, isLoggedIn } = useDerivAuth()
  const [markets, setMarkets] = useState<MarketAnalysis[]>([])
  const [threshold, setThreshold] = useState(55)
  const [tickWindow, setTickWindow] = useState(50)
  const [mode, setMode] = useState<"over" | "under">("over")
  const [level, setLevel] = useState(3)
  const [wsManager] = useState(() => DerivWebSocketManager.getInstance())

  const calculateProbability = useCallback(
    (digits: number[]) => {
      if (digits.length === 0) return 0

      let count = 0
      if (mode === "over") {
        count = digits.filter((d) => d > level).length
      } else {
        count = digits.filter((d) => d < level).length
      }

      return (count / digits.length) * 100
    },
    [mode, level],
  )

  const updateMarketTick = useCallback(
    (symbol: string, tick: any) => {
      setMarkets((prev) => {
        const existing = prev.find((m) => m.symbol === symbol)
        const lastDigit = extractLastDigit(tick.quote, symbol)

        if (existing) {
          const newDigits = [...existing.digits, lastDigit].slice(-tickWindow)
          const probability = calculateProbability(newDigits)

          let signal: "entry" | "exit" | "hold" = "hold"
          if (probability >= threshold) {
            signal = existing.probability >= threshold ? "hold" : "entry"
          } else {
            signal = existing.probability >= threshold ? "exit" : "hold"
          }

          return prev.map((m) =>
            m.symbol === symbol
              ? {
                  ...m,
                  price: tick.quote,
                  lastDigit,
                  digits: newDigits,
                  probability,
                  signal,
                }
              : m,
          )
        }

        return prev
      })
    },
    [tickWindow, threshold, calculateProbability],
  )

  useEffect(() => {
    if (!isLoggedIn || !token) return

    const init = async () => {
      try {
        await wsManager.connect()
        await wsManager.authorize(token)

        const symbols = await wsManager.getActiveSymbols()
        const digitMarkets = symbols.filter((s) => s.symbol.startsWith("R_") || s.symbol.includes("1HZ")).slice(0, 12)

        const initialMarkets: MarketAnalysis[] = digitMarkets.map((s) => ({
          symbol: s.symbol,
          displayName: s.display_name,
          price: 0,
          lastDigit: 0,
          digits: [],
          probability: 0,
          signal: "hold",
        }))

        setMarkets(initialMarkets)

        digitMarkets.forEach((market) => {
          wsManager.subscribeTicks(market.symbol, (tick) => {
            updateMarketTick(market.symbol, tick)
          })
        })
      } catch (error) {
        console.error("[v0] Killer Over/Under init error:", error)
      }
    }

    init()

    return () => {
      wsManager.unsubscribeAll()
    }
  }, [isLoggedIn, token, wsManager, updateMarketTick])

  if (!isLoggedIn) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Please log in to access Over/Under Analysis</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Mode</label>
              <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="over">Over</SelectItem>
                  <SelectItem value="under">Under</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Level</label>
              <Select value={String(level)} onValueChange={(v) => setLevel(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mode === "over" ? (
                    <>
                      <SelectItem value="1">Over 1</SelectItem>
                      <SelectItem value="2">Over 2</SelectItem>
                      <SelectItem value="3">Over 3</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="6">Under 6</SelectItem>
                      <SelectItem value="7">Under 7</SelectItem>
                      <SelectItem value="8">Under 8</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Tick Window: {tickWindow}</label>
            <Slider
              value={[tickWindow]}
              onValueChange={(v) => setTickWindow(v[0])}
              min={25}
              max={200}
              step={25}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Threshold: {threshold}%</label>
            <Slider
              value={[threshold]}
              onValueChange={(v) => setThreshold(v[0])}
              min={50}
              max={70}
              step={1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Markets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {markets.map((market) => (
          <Card
            key={market.symbol}
            className={`bg-slate-900/50 border-2 transition-all ${
              market.signal === "entry"
                ? mode === "over"
                  ? "border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] animate-pulse"
                  : "border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse"
                : "border-slate-700/50"
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{market.displayName}</CardTitle>
                {market.signal === "entry" && (
                  <Badge
                    variant="outline"
                    className={`${
                      mode === "over" ? "border-orange-500 text-orange-400" : "border-blue-500 text-blue-400"
                    } font-bold animate-pulse`}
                  >
                    ENTRY
                  </Badge>
                )}
                {market.signal === "exit" && (
                  <Badge variant="outline" className="border-red-500 text-red-400 font-bold">
                    EXIT
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-mono font-bold">{market.price.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Digit:</span>
                <Badge variant="outline" className="font-mono text-lg">
                  {market.lastDigit}
                </Badge>
              </div>

              {/* Probability Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{mode === "over" ? `Over ${level}` : `Under ${level}`}</span>
                  <span className="font-bold">{market.probability.toFixed(1)}%</span>
                </div>
                <div className="h-6 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      mode === "over"
                        ? "bg-gradient-to-r from-orange-500 to-orange-400"
                        : "bg-gradient-to-r from-blue-500 to-blue-400"
                    } flex items-center justify-center text-xs font-bold transition-all duration-300`}
                    style={{ width: `${market.probability}%` }}
                  />
                </div>
              </div>

              {/* Last 10 Digits */}
              <div className="flex gap-1 justify-center pt-2 border-t border-slate-700/50">
                {market.digits.slice(-10).map((digit, idx) => {
                  const matches = mode === "over" ? digit > level : digit < level
                  return (
                    <div
                      key={idx}
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono ${
                        matches
                          ? mode === "over"
                            ? "bg-orange-500/20 text-orange-400 font-bold"
                            : "bg-blue-500/20 text-blue-400 font-bold"
                          : "bg-slate-800 text-slate-500"
                      }`}
                    >
                      {digit}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
