"use client"

import { useEffect, useRef } from "react"

interface LastDigitsLineChartProps {
  digits: number[]
}

export function LastDigitsLineChart({ digits }: LastDigitsLineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    if (digits.length === 0) return

    // Calculate dimensions
    const padding = 20
    const chartWidth = rect.width - padding * 2
    const chartHeight = rect.height - padding * 2
    const pointSpacing = chartWidth / (digits.length - 1 || 1)

    // Draw line
    ctx.beginPath()
    ctx.strokeStyle = "#8b5cf6" // Purple color
    ctx.lineWidth = 3
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    digits.forEach((digit, index) => {
      const x = padding + index * pointSpacing
      const y = padding + chartHeight - (digit / 9) * chartHeight

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Draw points and labels
    digits.forEach((digit, index) => {
      const x = padding + index * pointSpacing
      const y = padding + chartHeight - (digit / 9) * chartHeight

      // Draw point
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fillStyle = "#8b5cf6"
      ctx.fill()

      // Draw label
      ctx.fillStyle = "#8b5cf6"
      ctx.font = "bold 12px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(digit.toString(), x, y - 12)
    })
  }, [digits])

  return (
    <div className="w-full h-48 bg-gray-200 dark:bg-gray-800/50 rounded-lg p-4">
      <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
    </div>
  )
}
