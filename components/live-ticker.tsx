"use client"

import { useState, useEffect } from "react"

interface LiveTickerProps {
  price: number | undefined
  digit: number | null
  theme?: "light" | "dark"
  symbol?: string
}

export function LiveTicker({ price, digit, theme = "dark", symbol = "Volatility" }: LiveTickerProps) {
  const [animatingPrice, setAnimatingPrice] = useState(false)
  const [animatingDigit, setAnimatingDigit] = useState(false)
  const [prevPrice, setPrevPrice] = useState(price)
  const [prevDigit, setPrevDigit] = useState(digit)

  useEffect(() => {
    if (price !== prevPrice) {
      setAnimatingPrice(true)
      setPrevPrice(price)
      const timer = setTimeout(() => setAnimatingPrice(false), 500)
      return () => clearTimeout(timer)
    }
  }, [price, prevPrice])

  useEffect(() => {
    if (digit !== prevDigit) {
      setAnimatingDigit(true)
      setPrevDigit(digit)
      const timer = setTimeout(() => setAnimatingDigit(false), 500)
      return () => clearTimeout(timer)
    }
  }, [digit, prevDigit])

  const priceChange = price && prevPrice ? price - prevPrice : 0
  const priceUp = priceChange > 0
  const priceDown = priceChange < 0

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 rounded-lg border transition-all duration-300 ${
        theme === "dark"
          ? "bg-gradient-to-r from-slate-900/50 to-slate-800/50 border-cyan-500/30 glow-soft-cyan"
          : "bg-white border-cyan-200 shadow-sm"
      } ${animatingPrice || animatingDigit ? "border-cyan-400/60" : ""}`}
    >
      {/* Symbol and Market */}
      <div className="flex-shrink-0">
        <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>{symbol}</div>
        <div className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Market</div>
      </div>

      {/* Divider */}
      <div className={`w-px h-8 ${theme === "dark" ? "bg-cyan-500/20" : "bg-cyan-200/50"}`} />

      {/* Price Display */}
      <div className="flex-1">
        <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Current Price</div>
        <div
          className={`text-lg font-bold transition-all duration-300 ${
            animatingPrice
              ? priceUp
                ? "text-green-400 scale-110"
                : priceDown
                  ? "text-red-400 scale-110"
                  : "text-white"
              : theme === "dark"
                ? "text-white"
                : "text-gray-900"
          }`}
        >
          {price?.toFixed(5) || "---"}
          {priceUp && <span className="ml-1 text-green-400">▲</span>}
          {priceDown && <span className="ml-1 text-red-400">▼</span>}
        </div>
      </div>

      {/* Divider */}
      <div className={`w-px h-8 ${theme === "dark" ? "bg-cyan-500/20" : "bg-cyan-200/50"}`} />

      {/* Digit Display */}
      <div className="flex-shrink-0">
        <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Current Digit</div>
        <div
          className={`text-2xl font-bold transition-all duration-300 ${
            animatingDigit
              ? "scale-125 text-orange-400 animate-pulse"
              : theme === "dark"
                ? "text-orange-500"
                : "text-orange-600"
          }`}
        >
          {digit !== null ? digit : "0"}
        </div>
      </div>
    </div>
  )
}
