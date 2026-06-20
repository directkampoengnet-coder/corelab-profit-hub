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

    ctx.fillStyle = "#e5e7eb"
    ctx.fillRect(0, 0, rect.width, rect.height)

    if (digits.length === 0) return

    // Calculate dimensions
    const padding = 40
    const chartWidth = rect.width - padding * 2
    const chartHeight = rect.height - padding * 2
    const pointSpacing = chartWidth / (digits.length - 1 || 1)

    ctx.beginPath()
    ctx.strokeStyle = "#8b5cf6"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    digits.forEach((digit, index) => {
      const x = padding + index * pointSpacing
      const y = padding + chartHeight - (digit / 9) * chartHeight

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        const prevX = padding + (index - 1) * pointSpacing
        const prevY = padding + chartHeight - (digits[index - 1] / 9) * chartHeight

        const cp1x = prevX + (x - prevX) / 2.5
        const cp1y = prevY
        const cp2x = prevX + (1.5 * (x - prevX)) / 2.5
        const cp2y = y

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
      }
    })

    ctx.stroke()

    digits.forEach((digit, index) => {
      const x = padding + index * pointSpacing
      const y = padding + chartHeight - (digit / 9) * chartHeight

      const squareSize = 6
      ctx.fillStyle = "#8b5cf6"
      ctx.fillRect(x - squareSize / 2, y - squareSize / 2, squareSize, squareSize)

      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 1.5
      ctx.strokeRect(x - squareSize / 2, y - squareSize / 2, squareSize, squareSize)

      ctx.fillStyle = "#8b5cf6"
      ctx.font = "bold 16px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(digit.toString(), x, y - 15)
    })
  }, [digits])

  return (
    <div className="w-full h-48 sm:h-56 md:h-64 bg-gray-200 dark:bg-gray-800/50 rounded-lg p-4">
      <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
    </div>
  )
}
