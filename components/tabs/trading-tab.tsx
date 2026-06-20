"use client"
import { useCallback, useState, useEffect, useRef } from "react"
import { useDerivAPI } from "@/lib/deriv-api-context"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"
import { ManualTrader } from "./manual-trader"
import { AutoRunBot } from "./autorun-bot"
import { SpeedBot } from "./speedbot"

interface TradingTabProps {
  theme?: "light" | "dark"
}

export function TradingTab({ theme: propTheme }: TradingTabProps) {
  const {
    token: globalApiToken,
    isLoggedIn,
    balance: globalBalance,
    accountType: globalAccountType,
    accountCode: globalAccountCode,
  } = useDerivAuth()

  const { apiClient, isConnected, isAuthorized, error, connectionStatus } = useDerivAPI()

  const currentTheme = propTheme || "dark"
  const balance = globalBalance?.amount || 0
  const currency = globalBalance?.currency || "USD"
  const accountType = globalAccountType || "DEMO"

  const [activeTab, setActiveTab] = useState("manual")
  const [activeSymbols, setActiveSymbols] = useState<any[]>([])
  const [loadingMarkets, setLoadingMarkets] = useState(false)
  const [marketError, setMarketError] = useState<string | null>(null)

  const [sharedConfig, setSharedConfig] = useState({
    symbol: "R_100",
    tradeType: "DIGITS" as string,
    contractType: "DIGITEVEN",
    barrier: "5",
    barrier2: "",
    stake: 0.35,
    duration: 1,
    durationUnit: "t" as "t" | "s" | "m" | "h" | "d",
    martingale: 2.1,
    stopLoss: 50,
    takeProfit: 100,
  })

  const [currentTick, setCurrentTick] = useState<number | null>(null)
  const [currentDigit, setCurrentDigit] = useState<number>(0)
  const [tickTimestamp, setTickTimestamp] = useState<string>("")
  const tickSubRef = useRef<string | null>(null)

  const loadActiveSymbols = useCallback(async () => {
    if (!apiClient) return

    try {
      setLoadingMarkets(true)
      setMarketError(null)

      const symbols = await apiClient.getActiveSymbols()

      if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
        setMarketError("No markets available")
        setActiveSymbols([])
        return
      }

      // Filter to only open markets with safety check
      const openMarkets = symbols.filter((s: any) => s && s.exchange_is_open !== false)
      setActiveSymbols(openMarkets)

      // Set default symbol if none selected
      if (!sharedConfig.symbol && openMarkets.length > 0) {
        const defaultSymbol = openMarkets.find((s: any) => s.symbol === "R_100") || openMarkets[0]
        setSharedConfig((prev) => ({ ...prev, symbol: defaultSymbol.symbol }))
      }

      console.log("[v0] Loaded", openMarkets.length, "active markets")
    } catch (err: any) {
      console.error("[v0] Failed to load markets:", err)
      setMarketError(err.message || "Failed to load markets")
      setActiveSymbols([])
    } finally {
      setLoadingMarkets(false)
    }
  }, [apiClient, sharedConfig.symbol])

  useEffect(() => {
    if (apiClient && isConnected && isAuthorized) {
      loadActiveSymbols()
    }
  }, [apiClient, isConnected, isAuthorized, loadActiveSymbols])

  useEffect(() => {
    if (!apiClient || !sharedConfig.symbol || !isConnected || !isAuthorized) return

    const subscribeTicks = async () => {
      try {
        // Unsubscribe from previous
        if (tickSubRef.current) {
          await apiClient.forget(tickSubRef.current).catch(() => {})
        }

        tickSubRef.current = await apiClient.subscribeTicks(sharedConfig.symbol, (tick: any) => {
          if (tick.quote && Number.isFinite(tick.quote)) {
            setCurrentTick(tick.quote)
            setTickTimestamp(new Date(tick.epoch * 1000).toLocaleTimeString())

            const priceStr = tick.quote.toString()
            const decimalPart = priceStr.split(".")[1] || "0"
            const digit = Number.parseInt(decimalPart.slice(-1))
            setCurrentDigit(digit)
          }
        })

        console.log("[v0] Subscribed to ticks:", sharedConfig.symbol)
      } catch (err: any) {
        console.log("[v0] Tick subscription error:", err.message)
      }
    }

    subscribeTicks()

    return () => {
      if (tickSubRef.current && apiClient) {
        apiClient.forget(tickSubRef.current).catch(() => {})
        tickSubRef.current = null
      }
    }
  }, [apiClient, sharedConfig.symbol, isConnected, isAuthorized])

  const updateSharedConfig = useCallback((updates: Partial<typeof sharedConfig>) => {
    setSharedConfig((prev) => ({ ...prev, ...updates }))
  }, [])

  const isConnectedAndAuthorized = isConnected && isAuthorized

  return (
    <div
      className={`w-full rounded-lg p-3 sm:p-4 border ${currentTheme === "dark" ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20" : "bg-white border-gray-200"}`}
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-blue-500/20">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isConnectedAndAuthorized ? "bg-green-400 animate-pulse" : connectionStatus === "reconnecting" ? "bg-yellow-400 animate-pulse" : "bg-red-400"}`}
          />
          <span
            className={`text-xs sm:text-sm font-medium ${currentTheme === "dark" ? "text-gray-300" : "text-gray-700"}`}
          >
            {connectionStatus === "connecting"
              ? "Connecting..."
              : connectionStatus === "reconnecting"
                ? "Reconnecting..."
                : isConnectedAndAuthorized
                  ? "Connected"
                  : "Disconnected"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <h2 className={`text-base sm:text-lg font-bold ${currentTheme === "dark" ? "text-white" : "text-gray-900"}`}>
            Trade Now
          </h2>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">{accountType}</Badge>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs font-bold">
              {balance.toFixed(2)} {currency}
            </Badge>
          </div>
        </div>
      </div>

      {error && (
        <div
          className={`p-3 rounded-lg border mb-4 flex items-start gap-2 ${currentTheme === "dark" ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"}`}
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-400" />
          <div>
            <p className={`text-sm font-medium ${currentTheme === "dark" ? "text-red-400" : "text-red-600"}`}>Error</p>
            <p className={`text-xs mt-1 ${currentTheme === "dark" ? "text-red-300" : "text-red-500"}`}>{error}</p>
          </div>
        </div>
      )}

      {!isConnectedAndAuthorized ? (
        <div
          className={`p-4 rounded-lg border text-center ${currentTheme === "dark" ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"}`}
        >
          <p className={`text-sm ${currentTheme === "dark" ? "text-red-400" : "text-red-600"}`}>
            {connectionStatus === "connecting"
              ? "Connecting to API..."
              : connectionStatus === "reconnecting"
                ? "Reconnecting..."
                : "Please log in to start trading"}
          </p>
        </div>
      ) : (
        <>
          {currentTick !== null && (
            <div
              className={`p-4 rounded-lg border mb-4 ${currentTheme === "dark" ? "bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30" : "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className={`text-xs font-semibold mb-1 ${currentTheme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Current Price
                  </div>
                  <div className={`text-2xl font-bold ${currentTheme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
                    {currentTick.toFixed(5)}
                  </div>
                </div>
                <div className="text-center">
                  <div
                    className={`text-xs font-semibold mb-1 ${currentTheme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Last Digit
                  </div>
                  <div className={`text-3xl font-bold ${currentDigit % 2 === 0 ? "text-green-400" : "text-blue-400"}`}>
                    {currentDigit}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-xs font-semibold mb-1 ${currentTheme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                  >
                    Symbol
                  </div>
                  <div
                    className={`text-sm font-bold ${currentTheme === "dark" ? "text-orange-400" : "text-orange-600"}`}
                  >
                    {sharedConfig.symbol}
                  </div>
                  <div className={`text-xs ${currentTheme === "dark" ? "text-gray-500" : "text-gray-400"}`}>
                    {tickTimestamp}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList
              className={`grid w-full grid-cols-3 mb-6 h-12 ${currentTheme === "dark" ? "bg-[#0a0e27]/50 border border-blue-500/20" : "bg-gray-100"}`}
            >
              <TabsTrigger
                value="manual"
                className="text-sm font-semibold data-[state=active]:bg-blue-500 data-[state=active]:text-white"
              >
                Manual Trading
              </TabsTrigger>
              <TabsTrigger
                value="autorun"
                className="text-sm font-semibold data-[state=active]:bg-green-500 data-[state=active]:text-white"
              >
                AutoRun
              </TabsTrigger>
              <TabsTrigger
                value="speedbot"
                className="text-sm font-semibold data-[state=active]:bg-purple-500 data-[state=active]:text-white"
              >
                SpeedBot
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <ManualTrader
                theme={currentTheme}
                activeSymbols={activeSymbols}
                loadingMarkets={loadingMarkets}
                config={sharedConfig}
                onConfigChange={updateSharedConfig}
                currentTick={currentTick}
                currentDigit={currentDigit}
              />
            </TabsContent>

            <TabsContent value="autorun" className="space-y-4 mt-4">
              <AutoRunBot
                theme={currentTheme}
                activeSymbols={activeSymbols}
                loadingMarkets={loadingMarkets}
                config={sharedConfig}
                onConfigChange={updateSharedConfig}
                currentTick={currentTick}
                currentDigit={currentDigit}
              />
            </TabsContent>

            <TabsContent value="speedbot" className="space-y-4 mt-4">
              <SpeedBot
                theme={currentTheme}
                activeSymbols={activeSymbols}
                loadingMarkets={loadingMarkets}
                config={sharedConfig}
                onConfigChange={updateSharedConfig}
                currentTick={currentTick}
                currentDigit={currentDigit}
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

export default TradingTab
