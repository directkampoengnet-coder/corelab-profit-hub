"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useDeriv } from "@/hooks/use-deriv"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { Tabs, TabsContent, TabsTrigger, TabsList } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Moon, Sun, Rocket, Settings, Activity } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MarketSelector } from "@/components/market-selector"
import { DigitDistribution } from "@/components/digit-distribution"
import { SignalsTab } from "@/components/tabs/signals-tab"
import { EvenOddTab } from "@/components/tabs/even-odd-tab"
import { OverUnderTab } from "@/components/tabs/over-under-tab"
import { MatchesTab } from "@/components/tabs/matches-tab"
import { DiffersTab } from "@/components/tabs/differs-tab"
import { RiseFallTab } from "@/components/tabs/rise-fall-tab"
import { TradingViewTab } from "@/components/tabs/trading-view-tab"
import { StatisticalAnalysis } from "@/components/statistical-analysis"
import { LastDigitsChart } from "@/components/charts/last-digits-chart"
import { LastDigitsLineChart } from "@/components/charts/last-digits-line-chart"
import { AIAnalysisTab } from "@/components/tabs/ai-analysis-tab"
import { SuperSignalsTab } from "@/components/tabs/super-signals-tab"
import { LoadingScreen } from "@/components/loading-screen"
import { DerivAuth } from "@/components/deriv-auth"
import { AutoBotTab } from "@/components/tabs/autobot-tab"
import { AutomatedTab } from "@/components/tabs/automated-tab"
import { SmartAuto24Tab } from "@/components/tabs/smartauto24-tab"
import { LiveTicker } from "@/components/live-ticker"
import { TradeNowTab } from "@/components/tabs/trade-now-tab"
import { ToolsInfoTab } from "@/components/tabs/tools-info-tab"
import TradingBotSlider from "@/components/tabs/Slider"
import { AutoTraderTab } from "@/components/tabs/autotrader-tab"
import { KillerTab } from "@/components/tabs/killer-tab"

export default function DerivAnalysisApp() {
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [isLoading, setIsLoading] = useState(true)
  const [isSliderOpen, setIsSliderOpen] = useState(false)

  const { accountType } = useDerivAuth()

  const {
    connectionStatus,
    currentPrice,
    currentDigit,
    tickCount,
    analysis,
    signals,
    symbol,
    maxTicks,
    availableSymbols,
    changeSymbol,
    changeMaxTicks,
    getRecentDigits,
  } = useDeriv()

  const recentDigits = useMemo(() => getRecentDigits(20), [getRecentDigits])
  const recent40Digits = useMemo(() => getRecentDigits(40), [getRecentDigits])
  const recent50Digits = useMemo(() => getRecentDigits(50), [getRecentDigits])
  const recent100Digits = useMemo(() => getRecentDigits(100), [getRecentDigits])

  const activeSignals = useMemo(() => (signals || []).filter((s) => s.status !== "NEUTRAL"), [signals])
  const powerfulSignalsCount = useMemo(
    () => activeSignals.filter((s) => s.status === "TRADE NOW").length,
    [activeSignals],
  )

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [theme])

  useEffect(() => {
    document.documentElement.classList.add("dark")
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <LoadingScreen
        onComplete={() => {
          setIsLoading(false)
        }}
      />
    )
  }

  return (
    <div
      className={`min-h-screen ${theme === "dark" ? "bg-gradient-to-br from-[#0a0e27] via-[#0f1629] to-[#1a1f3a]" : "bg-gradient-to-br from-gray-50 via-white to-gray-100"}`}
    >
      {isSliderOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-6xl max-h-[90vh] overflow-auto">
            <button
              onClick={() => setIsSliderOpen(false)}
              className="absolute top-4 right-4 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <TradingBotSlider dashboardSymbol={symbol} dashboardPrice={currentPrice} dashboardDigit={currentDigit} />
          </div>
        </div>
      )}

      <header
        className={`border-b ${
          accountType === "Real"
            ? "border-green-500/30 bg-gradient-to-r from-green-900/60 to-green-800/60 backdrop-blur-md"
            : accountType === "Demo"
              ? "border-yellow-500/30 bg-gradient-to-r from-yellow-900/60 to-yellow-800/60 backdrop-blur-md"
              : "border-blue-500/20 bg-[#0a0e27]/80 backdrop-blur-md"
        } sticky top-0 z-50 shadow-lg`}
      >
        <div className="w-full px-3 sm:px-4 md:px-6 py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <Rocket className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
              <span className="text-lg sm:text-xl md:text-2xl font-black bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent whitespace-nowrap">
                Profit Hub
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center max-w-md">
              {availableSymbols.length > 0 && (
                <div className="hidden sm:block">
                  <MarketSelector
                    symbols={availableSymbols}
                    currentSymbol={symbol}
                    onSymbolChange={changeSymbol}
                    theme={theme}
                  />
                </div>
              )}
              <Badge
                className={`text-xs px-2 py-1 ${
                  connectionStatus === "connected"
                    ? "bg-green-500/20 text-green-400 border-green-500/50"
                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50 animate-pulse"
                }`}
              >
                <Activity className="h-3 w-3 mr-1 inline" />
                {connectionStatus === "connected" ? "LIVE" : "Connecting..."}
              </Badge>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <DerivAuth theme={theme} />

              <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 sm:h-9 sm:w-9">
                {theme === "dark" ? (
                  <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                ) : (
                  <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                )}
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className={`w-72 ${theme === "dark" ? "bg-[#0a0e27] border-blue-500/30" : "bg-white"}`}
                  align="end"
                >
                  <div className="space-y-4">
                    <h3 className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Settings</h3>

                    {availableSymbols.length > 0 && (
                      <div className="space-y-2 sm:hidden">
                        <label
                          className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                        >
                          Market
                        </label>
                        <MarketSelector
                          symbols={availableSymbols}
                          currentSymbol={symbol}
                          onSymbolChange={changeSymbol}
                          theme={theme}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className={`text-sm font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        Max Ticks History
                      </label>
                      <Select value={maxTicks.toString()} onValueChange={(value) => changeMaxTicks(Number(value))}>
                        <SelectTrigger className={theme === "dark" ? "bg-slate-800 border-slate-600 text-white" : ""}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[50, 100, 200, 500, 1000].map((tick) => (
                            <SelectItem key={tick} value={tick.toString()}>
                              {tick} Ticks
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-slate-800/50" : "bg-gray-100"}`}>
                      <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                        Current Market
                      </p>
                      <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{symbol}</p>
                      <p className={`text-sm ${theme === "dark" ? "text-cyan-400" : "text-blue-600"}`}>
                        {currentPrice?.toFixed(4) || "---"}
                      </p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </header>

      <LiveTicker theme={theme} />

      <main className="container-responsive py-4 sm:py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div
            className={`p-3 sm:p-4 rounded-xl border ${
              theme === "dark"
                ? "bg-gradient-to-br from-blue-900/30 to-cyan-900/20 border-blue-500/20"
                : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Current Price</div>
            <div className={`text-lg sm:text-xl font-bold ${theme === "dark" ? "text-cyan-400" : "text-blue-600"}`}>
              {currentPrice?.toFixed(4) || "---"}
            </div>
          </div>
          <div
            className={`p-3 sm:p-4 rounded-xl border ${
              theme === "dark"
                ? "bg-gradient-to-br from-purple-900/30 to-pink-900/20 border-purple-500/20"
                : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Last Digit</div>
            <div
              className={`text-2xl sm:text-3xl font-bold ${
                currentDigit !== null
                  ? currentDigit % 2 === 0
                    ? "text-blue-400"
                    : "text-orange-400"
                  : theme === "dark"
                    ? "text-gray-500"
                    : "text-gray-400"
              }`}
            >
              {currentDigit !== null ? currentDigit : "-"}
            </div>
          </div>
          <div
            className={`p-3 sm:p-4 rounded-xl border ${
              theme === "dark"
                ? "bg-gradient-to-br from-emerald-900/30 to-green-900/20 border-emerald-500/20"
                : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Ticks</div>
            <div className={`text-lg sm:text-xl font-bold ${theme === "dark" ? "text-emerald-400" : "text-green-600"}`}>
              {tickCount}
            </div>
          </div>
          <div
            className={`p-3 sm:p-4 rounded-xl border ${
              theme === "dark"
                ? "bg-gradient-to-br from-amber-900/30 to-yellow-900/20 border-amber-500/20"
                : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Active Signals</div>
            <div className={`text-lg sm:text-xl font-bold ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`}>
              {powerfulSignalsCount}
            </div>
          </div>
        </div>

        <Tabs defaultValue="smart-analysis" className="space-y-4">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <TabsList
              className={`inline-flex gap-1 sm:gap-2 p-1 rounded-xl w-max min-w-full sm:min-w-0 ${
                theme === "dark" ? "bg-slate-800/50 backdrop-blur-sm" : "bg-gray-100"
              }`}
            >
              {[
                "smart-analysis",
                "signals",
                "super-signals",
                "even-odd",
                "over-under",
                "matches",
                "differs",
                "rise-fall",
                "ai-analysis",
                "autobot",
                "automated",
                "autotrader",
                "killer",
                "slider",
                "trading-view",
                "trade-now",
                "smartauto24",
                "tools-info",
              ].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className={`flex-shrink-0 rounded-lg border border-transparent text-[10px] sm:text-xs md:text-sm px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap transition-all capitalize font-medium ${
                    tab === "smartauto24"
                      ? "data-[state=active]:border-yellow-500 data-[state=active]:bg-yellow-500/10 data-[state=active]:text-yellow-400 data-[state=active]:shadow-[0_2px_10px_rgba(234,179,8,0.25)]"
                      : tab === "autobot" ||
                          tab === "automated" ||
                          tab === "slider" ||
                          tab === "autotrader" ||
                          tab === "killer"
                        ? "data-[state=active]:border-cyan-500 data-[state=active]:bg-cyan-500/10 data-[state=active]:text-cyan-400 data-[state=active]:shadow-[0_2px_10px_rgba(34,211,238,0.25)]"
                        : tab === "tools-info"
                          ? "data-[state=active]:border-purple-500 data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-400 data-[state=active]:shadow-[0_2px_10px_rgba(168,85,247,0.25)]"
                          : tab === "trade-now"
                            ? "data-[state=active]:border-emerald-500 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 data-[state=[0_2px_10px_rgba(34,197,94,0.25)]"
                            : "data-[state=active]:border-emerald-400 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400 data-[state=active]:shadow-[0_2px_10px_rgba(34,211,238,0.25)]"
                  } data-[state=active]:bg-transparent ${theme === "dark" ? "text-gray-400 hover:text-white hover:bg-slate-800/50" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/50"}`}
                >
                  {tab.replace(/-/g, " ")}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="smart-analysis" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DigitDistribution
                frequencies={analysis?.digitFrequencies || []}
                currentDigit={currentDigit}
                theme={theme}
              />
              <StatisticalAnalysis recentDigits={recentDigits} theme={theme} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <LastDigitsChart digits={recent40Digits} theme={theme} />
              <LastDigitsLineChart digits={recent50Digits} theme={theme} />
            </div>
          </TabsContent>

          <TabsContent value="signals" className="mt-0">
            <SignalsTab signals={signals} proSignals={[]} analysis={analysis} theme={theme} />
          </TabsContent>

          <TabsContent value="super-signals" className="mt-0">
            <SuperSignalsTab theme={theme} />
          </TabsContent>

          <TabsContent value="even-odd" className="mt-0">
            <EvenOddTab theme={theme} recentDigits={recent100Digits} signals={signals} />
          </TabsContent>

          <TabsContent value="over-under" className="mt-0">
            <OverUnderTab theme={theme} recentDigits={recent100Digits} signals={signals} />
          </TabsContent>

          <TabsContent value="matches" className="mt-0">
            <MatchesTab theme={theme} signals={signals} recentDigits={recentDigits} />
          </TabsContent>

          <TabsContent value="differs" className="mt-0">
            <DiffersTab theme={theme} signals={signals} />
          </TabsContent>

          <TabsContent value="rise-fall" className="mt-0">
            <RiseFallTab theme={theme} signals={signals} recentDigits={recentDigits} />
          </TabsContent>

          <TabsContent value="ai-analysis" className="mt-0">
            <AIAnalysisTab theme={theme} recentDigits={recent100Digits} analysis={analysis} />
          </TabsContent>

          <TabsContent value="autobot" className="mt-0">
            <AutoBotTab theme={theme} />
          </TabsContent>

          <TabsContent value="automated" className="mt-0">
            <AutomatedTab theme={theme} />
          </TabsContent>

          <TabsContent value="autotrader" className="mt-0">
            <AutoTraderTab theme={theme} />
          </TabsContent>

          <TabsContent value="killer" className="mt-0">
            <KillerTab theme={theme} />
          </TabsContent>

          <TabsContent value="slider" className="mt-0">
            <TradingBotSlider dashboardSymbol={symbol} dashboardPrice={currentPrice} dashboardDigit={currentDigit} />
          </TabsContent>

          <TabsContent value="trading-view" className="mt-0">
            <TradingViewTab theme={theme} />
          </TabsContent>

          <TabsContent value="trade-now" className="mt-0">
            <TradeNowTab theme={theme} />
          </TabsContent>

          <TabsContent value="smartauto24" className="mt-0">
            <SmartAuto24Tab theme={theme} />
          </TabsContent>

          <TabsContent value="tools-info" className="mt-0">
            <ToolsInfoTab theme={theme} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
