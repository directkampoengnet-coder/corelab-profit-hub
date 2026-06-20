"use client"

import { motion } from "framer-motion"

interface ConfidenceGaugeProps {
  confidence: number
  label?: string
}

export function ConfidenceGauge({ confidence, label = "Confidence" }: ConfidenceGaugeProps) {
  const clampedConfidence = Math.max(0, Math.min(100, confidence))
  const rotation = (clampedConfidence / 100) * 180 - 90

  const getColor = () => {
    if (clampedConfidence >= 70) return "hsl(var(--success))"
    if (clampedConfidence >= 50) return "hsl(var(--chart-5))"
    return "hsl(var(--destructive))"
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-48 h-24">
        {/* Gauge background */}
        <svg className="w-full h-full" viewBox="0 0 200 100">
          <path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <motion.path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke={getColor()}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray="251.2"
            initial={{ strokeDashoffset: 251.2 }}
            animate={{ strokeDashoffset: 251.2 - (251.2 * clampedConfidence) / 100 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          {/* Needle */}
          <motion.line
            x1="100"
            y1="90"
            x2="100"
            y2="30"
            stroke="hsl(var(--foreground))"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ rotate: -90 }}
            animate={{ rotate: rotation }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ transformOrigin: "100px 90px" }}
          />
          <circle cx="100" cy="90" r="6" fill="hsl(var(--foreground))" />
        </svg>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold text-foreground">{clampedConfidence.toFixed(1)}%</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}
