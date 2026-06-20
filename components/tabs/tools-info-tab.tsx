"use client"
import { useState, useEffect } from "react"
import { BotTab } from "./bot-tab"
import { SettingsPanel } from "@/components/settings-panel"
import { HelpPanel } from "@/components/help-panel"
import { ConnectionLogs } from "@/components/connection-logs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ErrorBoundary } from "@/components/error-boundary"
import type { ConnectionLog } from "@/lib/types"

interface ToolsInfoTabProps {
  theme: "light" | "dark"
  connectionLogs: ConnectionLog[]
}

export function ToolsInfoTab({ theme, connectionLogs = [] }: ToolsInfoTabProps) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    try {
      console.log("[v0] Tools & Info tab loaded successfully")
    } catch (error) {
      console.error("[v0] Error in Tools & Info tab:", error)
      setHasError(true)
    }
  }, [])

  if (hasError) {
    return (
      <div className="text-center py-16">
        <p className={theme === "dark" ? "text-red-400" : "text-red-600"}>
          An error occurred loading this tab. Please refresh the page.
        </p>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="w-full">
        <Tabs defaultValue="bots" className="w-full">
          <TabsList
            className={`w-full justify-start border-b rounded-none ${theme === "dark" ? "border-blue-500/20 bg-[#0f1629]/50" : "border-gray-200 bg-white/50"} overflow-x-auto p-0`}
          >
            {[
              { value: "bots", label: "Trading Bots 🤖", icon: "🤖" },
              { value: "settings", label: "Settings ⚙️", icon: "⚙️" },
              { value: "help", label: "Help & Documentation 📚", icon: "📚" },
              { value: "logs", label: "Connection Logs 📋", icon: "📋" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={`flex-shrink-0 rounded-none border-b-2 border-transparent text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-3 whitespace-nowrap transition-all font-medium ${
                  theme === "dark"
                    ? "text-gray-400 hover:text-white data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 data-[state=active]:bg-blue-500/10"
                    : "text-gray-600 hover:text-gray-900 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-blue-50"
                }`}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="w-full p-4 sm:p-6">
            <TabsContent value="bots" className="mt-0">
              <ErrorBoundary>
                <BotTab theme={theme} />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <ErrorBoundary>
                <SettingsPanel />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="help" className="mt-0">
              <ErrorBoundary>
                <HelpPanel />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="logs" className="mt-0">
              <ErrorBoundary>
                <ConnectionLogs logs={connectionLogs} />
              </ErrorBoundary>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </ErrorBoundary>
  )
}
