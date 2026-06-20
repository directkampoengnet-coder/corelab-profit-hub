"use client"

import { motion } from "framer-motion"

interface PriceDisplayProps {
  price: number | null
  symbol: string
  digit: number | null
}

export function PriceDisplay({ price, symbol, digit }: PriceDisplayProps) {
  return (
    <div className="neomorph rounded-2xl p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="text-sm font-medium text-muted-foreground">{symbol}</div>
        <motion.div
          key={price}
          initial={{ scale: 0.95, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-6xl font-bold font-mono text-foreground"
        >
          {price?.toFixed(2) || "---"}
        </motion.div>
        {digit !== null && (
          <motion.div
            key={digit}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="neomorph-inset rounded-full h-20 w-20 flex items-center justify-center"
          >
            <span className="text-3xl font-bold text-primary">{digit}</span>
          </motion.div>
        )}
        <div className="text-xs text-muted-foreground">Last Digit</div>
      </div>
    </div>
  )
}
