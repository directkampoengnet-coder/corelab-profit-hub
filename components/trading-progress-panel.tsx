"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface TradingProgressPanelProps {
  isRunning: boolean
  status: "waiting" | "trading" | "completed" | "error"
  totalTrades: number
  wins: number
  losses: number
  currentProfit: number
  targetProfit: number
  stopLoss: number
  currentStake: number
  lastTradeResult?: "WIN" | "LOSS" | null
  lastTradeTime?: Date
  signalStatus?: "WAIT" | "TRADE NOW" | "STRONG" | null
}

export function TradingProgressPanel({
  isRunning,
  status,
  totalTrades,
  wins,
  losses,
  currentProfit,
  targetProfit,
  stopLoss,
  currentStake,
  lastTradeResult,
  lastTradeTime,
  signalStatus,
}: TradingProgressPanelProps) {
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : "0.0"
  const tpProgress = Math.min((currentProfit / targetProfit) * 100, 100)
  const slProgress = Math.min((Math.abs(currentProfit) / stopLoss) * 100, 100)
  const isProfitable = currentProfit >= 0

  const getStatusColor = () => {
    switch (status) {
      case "waiting":
        return "bg-yellow-500/20 border-yellow-500/30 text-yellow-400"
      case "trading":
        return "bg-blue-500/20 border-blue-500/30 text-blue-400"
      case "completed":
        return "bg-green-500/20 border-green-500/30 text-green-400"
      case "error":
        return "bg-red-500/20 border-red-500/30 text-red-400"
      default:
        return "bg-gray-500/20 border-gray-500/30 text-gray-400"
    }
  }

  const getSignalBadgeColor = () => {
    switch (signalStatus) {
      case "WAIT":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case "TRADE NOW":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "STRONG":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Trading Progress</CardTitle>
          <div className="flex gap-2">
            {signalStatus && <Badge className={getSignalBadgeColor()}>{signalStatus}</Badge>}
            <Badge className={`${getStatusColor()} border`}>{status.toUpperCase()}</Badge>
            {isRunning && <Badge variant="default">LIVE</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-700/30 p-3 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">Total Trades</p>
            <p className="text-2xl font-bold text-white">{totalTrades}</p>
          </div>
          <div className="bg-slate-700/30 p-3 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">Win Rate</p>
            <p className="text-2xl font-bold text-white">{winRate}%</p>
          </div>
          <div className="bg-slate-700/30 p-3 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">W/L</p>
            <p className="text-2xl font-bold text-white">
              <span className="text-green-400">{wins}</span>/<span className="text-red-400">{losses}</span>
            </p>
          </div>
          <div className="bg-slate-700/30 p-3 rounded-lg">
            <p className="text-xs text-slate-400 mb-1">Current Stake</p>
            <p className="text-2xl font-bold text-white">${currentStake.toFixed(2)}</p>
          </div>
        </div>

        {/* Profit/Loss Progress */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-300">Take Profit Target</span>
              <span className={`font-semibold ${isProfitable ? "text-green-400" : "text-slate-400"}`}>
                ${currentProfit.toFixed(2)} / ${targetProfit.toFixed(2)}
              </span>
            </div>
            <Progress value={tpProgress} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-300">Stop Loss Limit</span>
              <span className={`font-semibold ${!isProfitable ? "text-red-400" : "text-slate-400"}`}>
                ${Math.abs(currentProfit).toFixed(2)} / ${stopLoss.toFixed(2)}
              </span>
            </div>
            <Progress value={slProgress} className="h-2" />
          </div>
        </div>

        {/* Last Trade Info */}
        {lastTradeResult && (
          <div
            className={`p-3 rounded-lg border ${lastTradeResult === "WIN" ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}
          >
            <p className="text-xs text-slate-400 mb-1">Last Trade</p>
            <p className={`font-semibold ${lastTradeResult === "WIN" ? "text-green-400" : "text-red-400"}`}>
              {lastTradeResult === "WIN" ? "✓ WIN" : "✗ LOSS"}
              {lastTradeTime && (
                <span className="text-xs text-slate-400 ml-2">{lastTradeTime.toLocaleTimeString()}</span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
