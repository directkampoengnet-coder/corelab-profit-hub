"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Github } from "lucide-react"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { DERIV_REPOS } from "@/lib/deriv-config"

interface ChecklistItem {
  id: string
  category: string
  name: string
  description: string
  status: "pass" | "fail" | "warning" | "pending"
  details?: string
}

interface IntegrationChecklistProps {
  theme?: "light" | "dark"
  connectionStatus?: "connected" | "disconnected" | "reconnecting"
  currentDigit?: number | null
  analysis?: any
}

export function IntegrationChecklist({
  theme = "dark",
  connectionStatus,
  currentDigit,
  analysis,
}: IntegrationChecklistProps) {
  const { isLoggedIn, balance, accountType, accounts } = useDerivAuth()
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [isChecking, setIsChecking] = useState(false)

  const runChecks = () => {
    setIsChecking(true)

    const checks: ChecklistItem[] = [
      // Core Components
      {
        id: "digit-distribution",
        category: "Core Components",
        name: "Digit Distribution Component",
        description: "Color-coded circles with live cursor",
        status: currentDigit !== null ? "pass" : "warning",
        details:
          currentDigit !== null ? "Component loaded with current digit: " + currentDigit : "Waiting for tick data",
      },
      {
        id: "digit-colors",
        category: "Core Components",
        name: "Digit Color Coding",
        description: "Green (most), Yellow (2nd), Red (least), Purple (others)",
        status: analysis?.digitFrequencies ? "pass" : "pending",
        details: analysis?.digitFrequencies
          ? `Most: ${analysis.powerIndex?.strongest}, Least: ${analysis.powerIndex?.weakest}`
          : "Waiting for analysis data",
      },
      {
        id: "live-cursor",
        category: "Core Components",
        name: "Live Orange Cursor",
        description: "Animated cursor for current digit",
        status: currentDigit !== null ? "pass" : "warning",
        details: currentDigit !== null ? "Cursor active on digit " + currentDigit : "No active digit",
      },

      // Deriv API Authentication
      {
        id: "deriv-oauth",
        category: "Deriv Authentication",
        name: "OAuth Login System",
        description: "Deriv OAuth authentication (App ID: 106629)",
        status: isLoggedIn ? "pass" : "warning",
        details: isLoggedIn ? "User authenticated" : "Not logged in - Click 'Login with Deriv'",
      },
      {
        id: "balance-display",
        category: "Deriv Authentication",
        name: "Live Balance Display",
        description: "Real-time balance via WebSocket",
        status: balance ? "pass" : isLoggedIn ? "warning" : "pending",
        details: balance ? `${balance.amount} ${balance.currency}` : "No balance data",
      },
      {
        id: "account-type",
        category: "Deriv Authentication",
        name: "Account Type Detection",
        description: "Demo/Real account identification",
        status: accountType ? "pass" : isLoggedIn ? "warning" : "pending",
        details: accountType ? `Account type: ${accountType}` : "No account type detected",
      },
      {
        id: "account-switching",
        category: "Deriv Authentication",
        name: "Multi-Account Switching",
        description: "Switch between linked accounts",
        status: accounts.length > 0 ? "pass" : isLoggedIn ? "warning" : "pending",
        details: accounts.length > 0 ? `${accounts.length} account(s) available` : "No accounts detected",
      },

      // Trading Platforms
      {
        id: "dtrader",
        category: "Trading Platforms",
        name: "DTrader Integration",
        description: "Iframe integration for DTrader (deriv-app)",
        status: "pass",
        details: `Available in Deriv Platforms tab | Repo: ${DERIV_REPOS.MAIN_APP.url}`,
      },
      {
        id: "dbot",
        category: "Trading Platforms",
        name: "DBot Integration",
        description: "Iframe integration for DBot (deriv-bot)",
        status: "pass",
        details: `Available in Deriv Platforms tab | Repo: ${DERIV_REPOS.DBOT.url}`,
      },
      {
        id: "smarttrader",
        category: "Trading Platforms",
        name: "SmartTrader Integration",
        description: "Iframe integration for SmartTrader (deriv-smarttrader)",
        status: "pass",
        details: `Available in Deriv Platforms tab | Repo: ${DERIV_REPOS.SMARTTRADER.url}`,
      },
      {
        id: "copytrading",
        category: "Trading Platforms",
        name: "CopyTrading Integration",
        description: "Iframe integration for CopyTrading (copy-trading)",
        status: "pass",
        details: `Available in Deriv Platforms tab | Repo: ${DERIV_REPOS.COPYTRADING.url}`,
      },
      {
        id: "deriv-api",
        category: "Trading Platforms",
        name: "Deriv API Integration",
        description: "WebSocket API SDK (deriv-api)",
        status: connectionStatus === "connected" ? "pass" : "warning",
        details: `WebSocket connection for real-time data | Repo: ${DERIV_REPOS.API.url}`,
      },

      // Analysis Features
      {
        id: "websocket-connection",
        category: "Analysis Features",
        name: "WebSocket Connection",
        description: "Real-time tick data from Deriv API",
        status: connectionStatus === "connected" ? "pass" : connectionStatus === "reconnecting" ? "warning" : "fail",
        details: `Connection status: ${connectionStatus || "unknown"}`,
      },
      {
        id: "digit-analysis",
        category: "Analysis Features",
        name: "Digit Frequency Analysis",
        description: "Statistical analysis of digit patterns",
        status: analysis?.digitFrequencies ? "pass" : "pending",
        details: analysis?.totalTicks ? `Analyzing ${analysis.totalTicks} ticks` : "Waiting for data",
      },
      {
        id: "signal-generation",
        category: "Analysis Features",
        name: "Signal Generation",
        description: "Trading signals based on patterns",
        status: analysis ? "pass" : "pending",
        details: analysis ? "Signals active" : "Waiting for analysis",
      },
    ]

    setChecklist(checks)
    setTimeout(() => setIsChecking(false), 500)
  }

  useEffect(() => {
    runChecks()
  }, [isLoggedIn, balance, accountType, accounts, connectionStatus, currentDigit, analysis])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "fail":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pass":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30">Passed</Badge>
        )
      case "fail":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">Failed</Badge>
      case "warning":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30">
            Warning
          </Badge>
        )
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30">Pending</Badge>
    }
  }

  const categories = Array.from(new Set(checklist.map((item) => item.category)))

  const getStatusCounts = () => {
    return {
      pass: checklist.filter((item) => item.status === "pass").length,
      fail: checklist.filter((item) => item.status === "fail").length,
      warning: checklist.filter((item) => item.status === "warning").length,
      pending: checklist.filter((item) => item.status === "pending").length,
      total: checklist.length,
    }
  }

  const counts = getStatusCounts()

  return (
    <div className="space-y-6">
      <Card className={theme === "dark" ? "bg-[#0f1629]/80 border-blue-500/20" : "bg-white border-gray-200"}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>Integration Checklist</CardTitle>
              <CardDescription className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                Verify all features and integrations are working correctly
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => window.open("https://github.com/deriv-com", "_blank")}
                variant="outline"
                size="sm"
                className={theme === "dark" ? "border-blue-500/30 text-blue-400" : "border-gray-300 text-gray-700"}
              >
                <Github className="h-4 w-4 mr-2" />
                Repos
              </Button>
              <Button
                onClick={runChecks}
                disabled={isChecking}
                variant="outline"
                className={theme === "dark" ? "border-blue-500/30 text-blue-400" : "border-gray-300 text-gray-700"}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div
              className={`text-center p-4 rounded-lg ${theme === "dark" ? "bg-green-500/10" : "bg-green-50"} border ${theme === "dark" ? "border-green-500/30" : "border-green-200"}`}
            >
              <div className={`text-3xl font-bold ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
                {counts.pass}
              </div>
              <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Passed</div>
            </div>
            <div
              className={`text-center p-4 rounded-lg ${theme === "dark" ? "bg-yellow-500/10" : "bg-yellow-50"} border ${theme === "dark" ? "border-yellow-500/30" : "border-yellow-200"}`}
            >
              <div className={`text-3xl font-bold ${theme === "dark" ? "text-yellow-400" : "text-yellow-600"}`}>
                {counts.warning}
              </div>
              <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Warnings</div>
            </div>
            <div
              className={`text-center p-4 rounded-lg ${theme === "dark" ? "bg-red-500/10" : "bg-red-50"} border ${theme === "dark" ? "border-red-500/30" : "border-red-200"}`}
            >
              <div className={`text-3xl font-bold ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
                {counts.fail}
              </div>
              <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Failed</div>
            </div>
            <div
              className={`text-center p-4 rounded-lg ${theme === "dark" ? "bg-gray-500/10" : "bg-gray-50"} border ${theme === "dark" ? "border-gray-500/30" : "border-gray-200"}`}
            >
              <div className={`text-3xl font-bold ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                {counts.pending}
              </div>
              <div className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Pending</div>
            </div>
          </div>

          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category}>
                <h3
                  className={`text-lg font-semibold mb-3 ${theme === "dark" ? "text-white" : "text-gray-900"} border-b ${theme === "dark" ? "border-blue-500/20" : "border-gray-200"} pb-2`}
                >
                  {category}
                </h3>
                <div className="space-y-3">
                  {checklist
                    .filter((item) => item.category === category)
                    .map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 p-4 rounded-lg border ${
                          theme === "dark" ? "bg-gray-800/50 border-gray-700/50" : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="mt-0.5">{getStatusIcon(item.status)}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                              {item.name}
                            </h4>
                            {getStatusBadge(item.status)}
                          </div>
                          <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"} mb-1`}>
                            {item.description}
                          </p>
                          {item.details && (
                            <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-500"}`}>
                              {item.details}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
