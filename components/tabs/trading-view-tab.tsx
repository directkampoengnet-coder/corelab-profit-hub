"use client"

interface TradingViewTabProps {
  theme?: "light" | "dark"
}

export function TradingViewTab({ theme = "dark" }: TradingViewTabProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div
        className={`rounded-xl p-4 sm:p-6 md:p-8 border ${
          theme === "dark"
            ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
            : "bg-white border-gray-200 shadow-lg"
        }`}
      >
        <h2
          className={`text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 text-center ${theme === "dark" ? "text-white" : "text-gray-900"}`}
        >
          Deriv Trading View
        </h2>

        <div className="w-full h-[400px] sm:h-[500px] md:h-[700px] rounded-lg overflow-hidden bg-gray-900">
          <iframe
            src="https://charts.deriv.com/"
            className="w-full h-full border-0"
            title="Deriv Trading View"
            allow="fullscreen"
          />
        </div>

        <div className={`text-xs sm:text-sm mt-4 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
          Live Deriv Trading Chart
        </div>
      </div>
    </div>
  )
}
