"use client"

interface TradingStats {
  totalWins: number
  totalLosses: number
  totalProfit: number
  winRate: number
  totalStake: number
  totalPayout: number
  numberOfRuns: number
  contractsLost: number
  contractsWon: number
}

interface TradingStatsPanelProps {
  stats: TradingStats
  theme: string
  onReset?: () => void
}

export function TradingStatsPanel({ stats, theme, onReset }: TradingStatsPanelProps) {
  return (
    <div
      className={`p-4 rounded-lg border ${theme === "dark" ? "bg-[#0a0e27]/50 border-blue-500/20" : "bg-gray-50 border-gray-200"}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Trading Statistics</h3>
        {onReset && (
          <button
            onClick={onReset}
            className={`text-xs px-2 py-1 rounded ${theme === "dark" ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-red-100 text-red-600 hover:bg-red-200"}`}
          >
            Clear Stats
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div
          className={`p-3 rounded-lg text-center ${theme === "dark" ? "bg-blue-500/10 border border-blue-500/30" : "bg-blue-50 border border-blue-200"}`}
        >
          <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Wins</div>
          <div className={`text-lg font-bold ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
            {stats.totalWins}
          </div>
        </div>

        <div
          className={`p-3 rounded-lg text-center ${theme === "dark" ? "bg-red-500/10 border border-red-500/30" : "bg-red-50 border border-red-200"}`}
        >
          <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Losses</div>
          <div className={`text-lg font-bold ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
            {stats.totalLosses}
          </div>
        </div>

        <div
          className={`p-3 rounded-lg text-center ${theme === "dark" ? "bg-green-500/10 border border-green-500/30" : "bg-green-50 border border-green-200"}`}
        >
          <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Profit</div>
          <div className={`text-lg font-bold ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
            ${stats.totalProfit.toFixed(2)}
          </div>
        </div>

        <div
          className={`p-3 rounded-lg text-center ${theme === "dark" ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-yellow-50 border border-yellow-200"}`}
        >
          <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Win Rate</div>
          <div className={`text-lg font-bold ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`}>
            {stats.winRate.toFixed(1)}%
          </div>
        </div>

        <div
          className={`p-3 rounded-lg text-center ${theme === "dark" ? "bg-purple-500/10 border border-purple-500/30" : "bg-purple-50 border border-purple-200"}`}
        >
          <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Total Stake</div>
          <div className={`text-lg font-bold ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`}>
            ${stats.totalStake.toFixed(2)}
          </div>
        </div>

        <div
          className={`p-3 rounded-lg text-center ${theme === "dark" ? "bg-cyan-500/10 border border-cyan-500/30" : "bg-cyan-50 border border-cyan-200"}`}
        >
          <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Total Payout</div>
          <div className={`text-lg font-bold ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>
            ${stats.totalPayout.toFixed(2)}
          </div>
        </div>

        <div
          className={`p-3 rounded-lg text-center ${theme === "dark" ? "bg-indigo-500/10 border border-indigo-500/30" : "bg-indigo-50 border border-indigo-200"}`}
        >
          <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>No. of Runs</div>
          <div className={`text-lg font-bold ${theme === "dark" ? "text-indigo-400" : "text-indigo-600"}`}>
            {stats.numberOfRuns}
          </div>
        </div>

        <div
          className={`p-3 rounded-lg text-center ${theme === "dark" ? "bg-pink-500/10 border border-pink-500/30" : "bg-pink-50 border border-pink-200"}`}
        >
          <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Contracts Won</div>
          <div className={`text-lg font-bold ${theme === "dark" ? "text-pink-400" : "text-pink-600"}`}>
            {stats.contractsWon}
          </div>
        </div>

        <div
          className={`p-3 rounded-lg text-center ${theme === "dark" ? "bg-orange-500/10 border border-orange-500/30" : "bg-orange-50 border border-orange-200"}`}
        >
          <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Contracts Lost</div>
          <div className={`text-lg font-bold ${theme === "dark" ? "text-orange-400" : "text-orange-600"}`}>
            {stats.contractsLost}
          </div>
        </div>
      </div>
    </div>
  )
}
