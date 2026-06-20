"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Trade {
  id: string
  timestamp: number
  volume: string
  tradeType: string
  contractType: string
  predicted: string
  result: "win" | "loss"
  entry: string
  exit: string
  stake: number
  profitLoss: number
}

interface TradeLogProps {
  trades: Trade[]
  theme: "light" | "dark"
}

export function TradeLog({ trades, theme }: TradeLogProps) {
  return (
    <Card
      className={`p-6 border ${
        theme === "dark"
          ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-purple-500/20"
          : "bg-white border-gray-200"
      }`}
    >
      <h3 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Trade Log</h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr
              className={`border-b ${theme === "dark" ? "border-gray-700 text-gray-400" : "border-gray-200 text-gray-600"}`}
            >
              <th className="text-left py-3 px-2 text-xs font-medium">Time</th>
              <th className="text-left py-3 px-2 text-xs font-medium">Strategy</th>
              <th className="text-left py-3 px-2 text-xs font-medium">Contract</th>
              <th className="text-left py-3 px-2 text-xs font-medium">Predicted</th>
              <th className="text-left py-3 px-2 text-xs font-medium">Entry</th>
              <th className="text-left py-3 px-2 text-xs font-medium">Exit</th>
              <th className="text-left py-3 px-2 text-xs font-medium">Stake</th>
              <th className="text-left py-3 px-2 text-xs font-medium">Result</th>
              <th className="text-right py-3 px-2 text-xs font-medium">P/L</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr
                key={trade.id}
                className={`border-b ${theme === "dark" ? "border-gray-800 hover:bg-gray-800/30" : "border-gray-100 hover:bg-gray-50"}`}
              >
                <td className={`py-3 px-2 text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  {new Date(trade.timestamp).toLocaleTimeString()}
                </td>
                <td className={`py-3 px-2 text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  {trade.tradeType}
                </td>
                <td className={`py-3 px-2 text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  {trade.contractType}
                </td>
                <td className={`py-3 px-2 text-xs ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                  {trade.predicted}
                </td>
                <td className={`py-3 px-2 text-xs font-mono ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  {trade.entry}
                </td>
                <td className={`py-3 px-2 text-xs font-mono ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  {trade.exit}
                </td>
                <td className={`py-3 px-2 text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  ${trade.stake.toFixed(2)}
                </td>
                <td className="py-3 px-2">
                  <Badge
                    className={`text-xs ${
                      trade.result === "win"
                        ? theme === "dark"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-green-100 text-green-700 border-green-200"
                        : theme === "dark"
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : "bg-red-100 text-red-700 border-red-200"
                    }`}
                  >
                    {trade.result.toUpperCase()}
                  </Badge>
                </td>
                <td
                  className={`py-3 px-2 text-xs font-bold text-right ${
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
