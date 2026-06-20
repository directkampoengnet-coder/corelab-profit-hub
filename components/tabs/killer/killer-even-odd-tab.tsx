"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { DerivWebSocketManager } from "@/lib/deriv-websocket-manager"
import { extractLastDigit } from "@/lib/deriv-markets"

interface MarketTick {
  symbol: string
  displayName: string
  price: number
  lastDigit: number
  digits: number[]
  evenCount: number
  oddCount: number
  evenPercentage: number
  oddPercentage: number
  dominance: "even" | "odd" | "neutral"
  signal: "entry" | "exit" | "hold"
}

export function KillerEvenOddTab() {
  const { token, isLoggedIn } = useDerivAuth()
  const [markets, setMarkets] = useState<MarketTick[]>([])
  const [threshold, setThreshold] = useState(55)
  const [tickWindow, setTickWindow] = useState(50)
  const [wsManager] = useState(() => DerivWebSocketManager.getInstance())

  const updateMarketTick = useCallback(
    (symbol: string, tick: any) => {
      setMarkets((prev) => {
        const existing = prev.find((m) => m.symbol === symbol)
        const lastDigit = extractLastDigit(tick.quote, symbol)

        if (existing) {
          const newDigits = [...existing.digits, lastDigit].slice(-tickWindow)
          const evenCount = newDigits.filter((d) => d % 2 === 0).length
          const oddCount = newDigits.length - evenCount
          const evenPercentage = (evenCount / newDigits.length) * 100
          const oddPercentage = (oddCount / newDigits.length) * 100

          let dominance: "even" | "odd" | "neutral" = "neutral"
          let signal: "entry" | "exit" | "hold" = "hold"

          if (evenPercentage >= threshold) {
            dominance = "even"
            signal = existing.dominance === "even" ? "hold" : "entry"
          } else if (oddPercentage >= threshold) {
            dominance = "odd"
            signal = existing.dominance === "odd" ? "hold" : "entry"
          } else {
            signal = existing.dominance !== "neutral" ? "exit" : "hold"
          }

          return prev.map((m) =>
            m.symbol === symbol
              ? {
                  ...m,
                  price: tick.quote,
                  lastDigit,
                  digits: newDigits,
                  evenCount,
                  oddCount,
                  evenPercentage,
                  oddPercentage,
                  dominance,
                  signal,
                }
              : m,
          )
        }

        return prev
      })
    },
    [tickWindow, threshold],
  )

  useEffect(() => {
    if (!isLoggedIn || !token) return

    const init = async () => {
      try {
        await wsManager.connect()
        await wsManager.authorize(token)

        const symbols = await wsManager.getActiveSymbols()
        const digitMarkets = symbols.filter((s) => s.symbol.startsWith("R_") || s.symbol.includes("1HZ")).slice(0, 12)

        const initialMarkets: MarketTick[] = digitMarkets.map((s) => ({
          symbol: s.symbol,
          displayName: s.display_name,
          price: 0,
          lastDigit: 0,
          digits: [],
          evenCount: 0,
          oddCount: 0,
          evenPercentage: 0,
          oddPercentage: 0,
          dominance: "neutral",
          signal: "hold",
        }))

        setMarkets(initialMarkets)

        digitMarkets.forEach((market) => {
          wsManager.subscribeTicks(market.symbol, (tick) => {
            updateMarketTick(market.symbol, tick)
          })
        })
      } catch (error) {
        console.error("[v0] Killer Even/Odd init error:", error)
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
          <p className="text-muted-foreground">Please log in to access Even/Odd Analysis</p>
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
            <label className="text-sm font-medium mb-2 block">Dominance Threshold: {threshold}%</label>
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
                ? market.dominance === "even"
                  ? "border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse"
                  : "border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.3)] animate-pulse"
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
                      market.dominance === "even"
                        ? "border-blue-500 text-blue-400"
                        : "border-orange-500 text-orange-400"
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
                <Badge
                  variant="outline"
                  className={`font-mono text-lg ${
                    market.lastDigit % 2 === 0
                      ? "border-blue-500 text-blue-400 bg-blue-500/10"
                      : "border-orange-500 text-orange-400 bg-orange-500/10"
                  }`}
                >
                  {market.lastDigit}
                </Badge>
              </div>

              {/* Even/Odd Bars */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-400 w-12">Even</span>
                  <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-center text-xs font-bold transition-all duration-300"
                      style={{ width: `${market.evenPercentage}%` }}
                    >
                      {market.evenPercentage.toFixed(0)}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-orange-400 w-12">Odd</span>
                  <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-orange-400 flex items-center justify-center text-xs font-bold transition-all duration-300"
                      style={{ width: `${market.oddPercentage}%` }}
                    >
                      {market.oddPercentage.toFixed(0)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Last 10 Digits */}
              <div className="flex gap-1 justify-center pt-2 border-t border-slate-700/50">
                {market.digits.slice(-10).map((digit, idx) => (
                  <div
                    key={idx}
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono ${
                      digit % 2 === 0 ? "bg-blue-500/20 text-blue-400" : "bg-orange-500/20 text-orange-400"
                    }`}
                  >
                    {digit}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
