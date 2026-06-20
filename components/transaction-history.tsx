"use client"

interface Transaction {
  id: string
  contractType: string
  market: string
  entrySpot: string
  exitSpot: string
  buyPrice: number
  profitLoss: number
  timestamp: number
  status: "win" | "loss"
}

interface TransactionHistoryProps {
  transactions: Transaction[]
  theme: string
  maxHeight?: string
}

export function TransactionHistory({ transactions, theme, maxHeight = "max-h-96" }: TransactionHistoryProps) {
  return (
    <div
      className={`p-4 rounded-lg border ${theme === "dark" ? "bg-[#0a0e27]/50 border-blue-500/20" : "bg-gray-50 border-gray-200"}`}
    >
      <h3 className={`text-sm font-bold mb-3 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
        Transaction History
      </h3>

      {transactions.length > 0 ? (
        <div className={`${maxHeight} overflow-y-auto space-y-2`}>
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className={`p-3 rounded border text-xs ${theme === "dark" ? "bg-[#0f1629]/30 border-blue-500/20" : "bg-white border-gray-200"}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold">{tx.contractType}</div>
                  <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>{tx.market}</div>
                </div>
                <div className={`font-bold ${tx.status === "win" ? "text-green-400" : "text-red-400"}`}>
                  {tx.profitLoss >= 0 ? "+" : ""}${tx.profitLoss.toFixed(2)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className={theme === "dark" ? "text-gray-500" : "text-gray-500"}>Entry:</span>
                  <span className={`ml-1 font-mono ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                    {tx.entrySpot}
                  </span>
                </div>
                <div>
                  <span className={theme === "dark" ? "text-gray-500" : "text-gray-500"}>Exit:</span>
                  <span className={`ml-1 font-mono ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                    {tx.exitSpot}
                  </span>
                </div>
                <div>
                  <span className={theme === "dark" ? "text-gray-500" : "text-gray-500"}>Stake:</span>
                  <span className={`ml-1 font-mono ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                    ${(tx.buyPrice || 0).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className={theme === "dark" ? "text-gray-500" : "text-gray-500"}>Time:</span>
                  <span className={`ml-1 font-mono ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                    {new Date(tx.timestamp * 1000).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={`text-xs text-center py-8 ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
          No transactions yet
        </p>
      )}
    </div>
  )
}
