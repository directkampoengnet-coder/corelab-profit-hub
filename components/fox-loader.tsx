"use client"

import { useEffect, useState } from "react"

interface FoxLoaderProps {
  progress?: number
  status?: string
}

export function FoxLoader({ progress = 0, status = "Initializing..." }: FoxLoaderProps) {
  const [displayProgress, setDisplayProgress] = useState(0)

  useEffect(() => {
    setDisplayProgress(progress)
  }, [progress])

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      {/* Profit Hub Logo with Dollar Sign and Glowing Animation */}
      <div className="relative">
        <div
          className="text-6xl font-bold text-center animate-pulse"
          style={{
            background: "linear-gradient(135deg, #10b981, #059669)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 30px rgba(16, 185, 129, 0.5))",
          }}
        >
          💰
        </div>
        <p className="text-2xl font-bold text-center mt-2 text-green-400 animate-pulse">Profit Hub</p>
      </div>

      {/* Progress bar with liquid fill effect */}
      <div className="w-64 relative">
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden border border-green-400/30">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500 rounded-full"
            style={{ width: `${displayProgress}%` }}
          />
        </div>
        <div className="text-center mt-2 text-sm font-semibold text-green-400">{displayProgress}%</div>
      </div>

      {/* Status text */}
      <div className="text-center">
        <p className="text-white text-lg font-semibold animate-pulse">{status}</p>
      </div>
    </div>
  )
}
