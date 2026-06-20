"use client"

import type { AnalysisResult } from "@/lib/analysis-engine"

interface StatisticalAnalysisProps {
  analysis: AnalysisResult
  recentDigits: number[]
  theme?: "light" | "dark"
}

export function StatisticalAnalysis({ analysis, recentDigits, theme = "dark" }: StatisticalAnalysisProps) {
  const safeRecentDigits = Array.isArray(recentDigits) ? recentDigits : []

  // Even/Odd stats
  const evenCount = safeRecentDigits.filter((d) => d % 2 === 0).length
  const oddCount = safeRecentDigits.filter((d) => d % 2 !== 0).length
  const evenPercentage = safeRecentDigits.length > 0 ? (evenCount / safeRecentDigits.length) * 100 : 0
  const oddPercentage = safeRecentDigits.length > 0 ? (oddCount / safeRecentDigits.length) * 100 : 0

  // Over/Under/Middle stats
  const underCount = safeRecentDigits.filter((d) => d <= 4).length
  const middleCount = safeRecentDigits.filter((d) => d >= 3 && d <= 6).length
  const overCount = safeRecentDigits.filter((d) => d >= 5).length
  const underPercentage = safeRecentDigits.length > 0 ? (underCount / safeRecentDigits.length) * 100 : 0
  const middlePercentage = safeRecentDigits.length > 0 ? (middleCount / safeRecentDigits.length) * 100 : 0
  const overPercentage = safeRecentDigits.length > 0 ? (overCount / safeRecentDigits.length) * 100 : 0

  return (
    <div className="space-y-8">
      <h3 className="text-xl sm:text-2xl font-bold text-foreground text-center">Statistical Analysis</h3>

      {/* Even / Odd Distribution */}
      <div className="space-y-4">
        <h4 className="text-lg sm:text-xl font-bold text-foreground text-center">Even / Odd Distribution</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Even */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-foreground font-semibold text-sm sm:text-base">Even Numbers</span>
              <span className="text-foreground font-bold text-lg sm:text-xl">{evenPercentage.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                style={{ width: `${evenPercentage}%` }}
              />
            </div>
          </div>

          {/* Odd */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-foreground font-semibold text-sm sm:text-base">Odd Numbers</span>
              <span className="text-foreground font-bold text-lg sm:text-xl">{oddPercentage.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${oddPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Over / Under Analysis */}
      <div className="space-y-4">
        <h4 className="text-lg sm:text-xl font-bold text-foreground text-center">Over / Under Analysis</h4>

        <div className="space-y-4">
          {/* Under (0-4) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-foreground font-semibold text-sm sm:text-base">0-4 (Under)</span>
              <span className="text-foreground font-bold text-lg sm:text-xl">{underPercentage.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${underPercentage}%` }}
              />
            </div>
          </div>

          {/* Middle (3-6) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-foreground font-semibold text-sm sm:text-base">3-6 (Middle)</span>
              <span className="text-foreground font-bold text-lg sm:text-xl">{middlePercentage.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full transition-all duration-500"
                style={{ width: `${middlePercentage}%` }}
              />
            </div>
          </div>

          {/* Over (5-9) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-foreground font-semibold text-sm sm:text-base">5-9 (Over)</span>
              <span className="text-foreground font-bold text-lg sm:text-xl">{overPercentage.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${overPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
