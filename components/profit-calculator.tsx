"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react"

interface ProfitCalculatorProps {
  stake: number
  payout?: number
  multiplier?: number
  theme: string
}

export function ProfitCalculator({ stake, payout, multiplier = 1.95, theme }: ProfitCalculatorProps) {
  const calculatedPayout = payout || stake * multiplier
  const potentialProfit = calculatedPayout - stake
  const roi = stake > 0 ? (potentialProfit / stake) * 100 : 0

  return (
    <Card
      className={`p-4 border ${theme === "dark" ? "bg-gradient-to-br from-emerald-900/20 to-cyan-900/20 border-emerald-500/30" : "bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200"}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Target className={`w-4 h-4 ${theme === "dark" ? "text-emerald-400" : "text-emerald-600"}`} />
        <h3 className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Profit Calculator</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"} mb-1`}>Current Stake</div>
          <div className={`flex items-center gap-1 ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>
            <DollarSign className="w-4 h-4" />
            <span className="text-lg font-bold">{stake.toFixed(2)}</span>
          </div>
        </div>

        <div>
          <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"} mb-1`}>Potential Payout</div>
          <div className={`flex items-center gap-1 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
            <DollarSign className="w-4 h-4" />
            <span className="text-lg font-bold">{calculatedPayout.toFixed(2)}</span>
          </div>
        </div>

        <div>
          <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"} mb-1`}>If Win</div>
          <div className={`flex items-center gap-1 text-emerald-400`}>
            <TrendingUp className="w-4 h-4" />
            <span className="text-lg font-bold">+{potentialProfit.toFixed(2)}</span>
          </div>
        </div>

        <div>
          <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"} mb-1`}>If Loss</div>
          <div className={`flex items-center gap-1 text-red-400`}>
            <TrendingDown className="w-4 h-4" />
            <span className="text-lg font-bold">-{stake.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className={`mt-4 pt-4 border-t ${theme === "dark" ? "border-emerald-500/20" : "border-emerald-200"}`}>
        <div className="flex justify-between items-center">
          <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            ROI (Return on Investment)
          </span>
          <span className={`text-sm font-bold ${roi > 0 ? "text-emerald-400" : "text-gray-400"}`}>
            {roi.toFixed(1)}%
          </span>
        </div>
      </div>
    </Card>
  )
}
