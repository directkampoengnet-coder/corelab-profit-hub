"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KillerEvenOddTab } from "./killer/killer-even-odd-tab"
import { KillerOverUnderTab } from "./killer/killer-over-under-tab"
import { KillerMarketScannerTab } from "./killer/killer-market-scanner-tab"
import { KillerAutobotsTab } from "./killer/killer-autobots-tab"
import { KillerAutotraderTab } from "./killer/killer-autotrader-tab"
import { KillerBulkTraderTab } from "./killer/killer-bulk-trader-tab"
import { KillerBotsTab } from "./killer/killer-bots-tab"

export function KillerTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-orange-500 bg-clip-text text-transparent">
            Killer Trading Platform
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Professional Deriv Digits Trading System</p>
        </div>
      </div>

      <Tabs defaultValue="even-odd" className="space-y-4">
        <TabsList className="inline-flex gap-1 p-1 rounded-xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50">
          {[
            { value: "even-odd", label: "Even/Odd", color: "blue" },
            { value: "over-under", label: "Over/Under", color: "orange" },
            { value: "scanner", label: "Market Scanner", color: "purple" },
            { value: "autobots", label: "AutoBots", color: "cyan" },
            { value: "autotrader", label: "AutoTrader", color: "emerald" },
            { value: "bulk-speedbot", label: "Bulk & SpeedBot", color: "red" },
            { value: "bots", label: "Bots Manager", color: "yellow" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-lg px-3 py-2 text-xs font-medium transition-all data-[state=active]:bg-slate-700/50 data-[state=active]:shadow-lg"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="even-odd">
          <KillerEvenOddTab />
        </TabsContent>

        <TabsContent value="over-under">
          <KillerOverUnderTab />
        </TabsContent>

        <TabsContent value="scanner">
          <KillerMarketScannerTab />
        </TabsContent>

        <TabsContent value="autobots">
          <KillerAutobotsTab />
        </TabsContent>

        <TabsContent value="autotrader">
          <KillerAutotraderTab />
        </TabsContent>

        <TabsContent value="bulk-speedbot">
          <KillerBulkTraderTab />
        </TabsContent>

        <TabsContent value="bots">
          <KillerBotsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
