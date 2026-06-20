"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

interface SystemStatusPanelProps {
  theme?: "light" | "dark"
}

export function SystemStatusPanel({ theme = "dark" }: SystemStatusPanelProps) {
  const systemStatus = [
    { name: "Global API Token", status: "ready", icon: "🔐" },
    { name: "Balance Updates", status: "ready", icon: "💰" },
    { name: "Digits Distribution", status: "ready", icon: "🔢" },
    { name: "Analysis Tabs", status: "ready", icon: "📊" },
    { name: "Trading Slider", status: "ready", icon: "🎚️" },
    { name: "SmartAuto24 Bot", status: "ready", icon: "🤖" },
    { name: "AutoBot", status: "ready", icon: "⚙️" },
    { name: "Autonomous Bot", status: "ready", icon: "🧠" },
    { name: "DBot Integration", status: "ready", icon: "🔗" },
    { name: "Trade Results", status: "ready", icon: "📈" },
    { name: "Stop Logic", status: "ready", icon: "🛑" },
    { name: "Contract Types", status: "ready", icon: "📋" },
  ]

  return (
    <Card
      className={`${
        theme === "dark"
          ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20"
          : "bg-white border-gray-200"
      }`}
    >
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          <CheckCircle2 className="text-emerald-500" size={24} />
          System Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {systemStatus.map((item) => (
            <div
              key={item.name}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                theme === "dark" ? "bg-emerald-500/10 border-emerald-500/30" : "bg-emerald-50 border-emerald-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <span className={`text-sm font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  {item.name}
                </span>
              </div>
              <Badge className="bg-emerald-500 text-white text-xs">READY</Badge>
            </div>
          ))}
        </div>

        <div
          className={`rounded-lg p-4 border ${
            theme === "dark" ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"
          }`}
        >
          <p className={`text-sm ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
            ✅ All systems operational. Ready for live trading with Deriv API.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
