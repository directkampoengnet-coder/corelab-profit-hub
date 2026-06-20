"use client"

interface JournalEntry {
  time: string
  message: string
  type: "info" | "success" | "error" | "warn"
}

interface TradingJournalPanelProps {
  entries: JournalEntry[]
  theme: string
  maxHeight?: string
}

export function TradingJournalPanel({ entries, theme, maxHeight = "max-h-64" }: TradingJournalPanelProps) {
  return (
    <div
      className={`p-4 rounded-lg border ${theme === "dark" ? "bg-[#0a0e27]/50 border-blue-500/20" : "bg-gray-50 border-gray-200"}`}
    >
      <h3 className={`text-sm font-bold mb-3 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Trading Journal</h3>

      <div className={`${maxHeight} overflow-y-auto space-y-1 font-mono text-xs`}>
        {entries.length > 0 ? (
          entries.map((entry, idx) => (
            <div
              key={idx}
              className={`${
                entry.type === "error"
                  ? "text-red-400"
                  : entry.type === "success"
                    ? "text-green-400"
                    : entry.type === "warn"
                      ? "text-yellow-400"
                      : "text-gray-400"
              }`}
            >
              <span className={theme === "dark" ? "text-gray-600" : "text-gray-500"}>[{entry.time}]</span>{" "}
              {entry.message}
            </div>
          ))
        ) : (
          <p className={`text-center py-4 ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
            No journal entries yet
          </p>
        )}
      </div>
    </div>
  )
}
