"use client"

import type { JournalEntry } from "@/lib/trading-journal"
import { Badge } from "@/components/ui/badge"

interface JournalDisplayProps {
  entries: JournalEntry[]
  theme: "light" | "dark"
}

export function JournalDisplay({ entries, theme }: JournalDisplayProps) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className={`w-full text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
          <thead>
            <tr className={`border-b ${theme === "dark" ? "border-gray-700" : "border-gray-300"}`}>
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Market</th>
              <th className="text-left p-2">Vol</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Stake</th>
              <th className="text-left p-2">Entry</th>
              <th className="text-left p-2">Exit</th>
              <th className="text-left p-2">Payout</th>
              <th className="text-left p-2">Result</th>
              <th className="text-left p-2">Profit</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className={`border-b ${theme === "dark" ? "border-gray-800" : "border-gray-200"}`}>
                <td className="p-2">{entry.timestamp.toLocaleTimeString()}</td>
                <td className="p-2">{entry.market}</td>
                <td className="p-2">{entry.volatility || "N/A"}</td>
                <td className="p-2">{entry.contractType}</td>
                <td className="p-2">${entry.stake.toFixed(2)}</td>
                <td className="p-2">{entry.entryPrice?.toFixed(4) || "N/A"}</td>
                <td className="p-2">{entry.exitPrice?.toFixed(4) || "N/A"}</td>
                <td className="p-2">${entry.payout?.toFixed(2) || "N/A"}</td>
                <td className="p-2">
                  <Badge
                    className={entry.action === "WIN" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}
                  >
                    {entry.action}
                  </Badge>
                </td>
                <td className={`p-2 font-bold ${entry.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                  ${entry.profit.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
