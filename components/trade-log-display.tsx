"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface TradeLogEntry {
  id: string
  timestamp: Date
  symbol: string
  contractType: string
  prediction?: string | number
  entryPrice: number
  exitPrice?: number
  stake: number
  result: "win" | "loss" | "pending"
  profitLoss: number
  duration?: number
}

interface TradeLogDisplayProps {
  trades: TradeLogEntry[]
  theme?: "light" | "dark"
  maxItems?: number
}

export function TradeLogDisplay({ trades, theme = "dark", maxItems = 50 }: TradeLogDisplayProps) {
  const displayTrades = trades.slice(0, maxItems)
  const totalProfitLoss = trades.reduce((sum, trade) => sum + trade.profitLoss, 0)
  const wins = trades.filter((t) => t.result === "win").length
  const losses = trades.filter((t) => t.result === "loss").length
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0

  return (
    <Card className={theme === "dark" ? "bg-[#0f1629]/80 border-cyan-500/20" : "bg-white border-gray-200"}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={theme === "dark" ? "text-cyan-400" : "text-cyan-600"}>Trade Log</CardTitle>
          <div className="flex gap-2">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Wins: {wins}</Badge>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Losses: {losses}</Badge>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">WR: {winRate.toFixed(1)}%</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {displayTrades.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No trades yet. Start trading to see your history.</p>
        ) : (
          <>
            {/* Summary */}
            <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Total Trades</p>
                  <p className="text-2xl font-bold text-white">{trades.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total P/L</p>
                  <p className={`text-2xl font-bold ${totalProfitLoss >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {totalProfitLoss >= 0 ? "+" : ""}${totalProfitLoss.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Trade List */}
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {displayTrades.map((trade) => (
                  <div
                    key={trade.id}
                    className={`p-3 rounded-lg border ${
                      theme === "dark"
                        ? trade.result === "win"
                          ? "bg-green-500/10 border-green-500/30"
                          : trade.result === "loss"
                            ? "bg-red-500/10 border-red-500/30"
                            : "bg-yellow-500/10 border-yellow-500/30"
                        : trade.result === "win"
                          ? "bg-green-50 border-green-200"
                          : trade.result === "loss"
                            ? "bg-red-50 border-red-200"
                            : "bg-yellow-50 border-yellow-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={trade.result === "win" ? "default" : "destructive"}
                          className={
                            trade.result === "win"
                              ? "bg-green-500 hover:bg-green-600"
                              : trade.result === "loss"
                                ? "bg-red-500 hover:bg-red-600"
                                : "bg-yellow-500 hover:bg-yellow-600"
                          }
                        >
                          {trade.result.toUpperCase()}
                        </Badge>
                        <span className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                          {trade.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          trade.profitLoss >= 0
                            ? theme === "dark"
                              ? "text-green-400"
                              : "text-green-600"
                            : theme === "dark"
                              ? "text-red-400"
                              : "text-red-600"
                        }`}
                      >
                        {trade.profitLoss >= 0 ? "+" : ""}${trade.profitLoss.toFixed(2)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className={theme === "dark" ? "text-gray-500" : "text-gray-600"}>Symbol</p>
                        <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                          {trade.symbol}
                        </p>
                      </div>
                      <div>
                        <p className={theme === "dark" ? "text-gray-500" : "text-gray-600"}>Contract</p>
                        <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                          {trade.contractType}
                        </p>
                      </div>
                      <div>
                        <p className={theme === "dark" ? "text-gray-500" : "text-gray-600"}>Stake</p>
                        <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                          ${trade.stake.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {trade.prediction !== undefined && (
                      <div className="mt-2 text-xs">
                        <span className={theme === "dark" ? "text-gray-500" : "text-gray-600"}>Prediction: </span>
                        <span className={`font-bold ${theme === "dark" ? "text-cyan-400" : "text-cyan-600"}`}>
                          {trade.prediction}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  )
}
