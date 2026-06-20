"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Play, AlertCircle } from "lucide-react"
import { useDerivAPI } from "@/lib/deriv-api-context"
import { getCachedMarkets, setCachedMarkets } from "@/lib/market-cache"

interface ManualTradeLog {
  id: string
  time: string
  market: string
  type: string
  entry: number
  exit: number
  stake: number
  payout: number
  profit: number
  result: "WIN" | "LOSS" | "PENDING"
}

interface SmartTraderProps {
  theme?: "light" | "dark"
  currency?: string
}

export function SmartTrader({ theme = "dark", currency = "USD" }: SmartTraderProps) {
  const { apiClient, isConnected, isAuthorized } = useDerivAPI()
  const [markets, setMarkets] = useState<any[]>([])
  const [selectedMarket, setSelectedMarket] = useState("R_100")
  const [contractType, setContractType] = useState("CALL")
  const [stake, setStake] = useState(0.35)
  const [duration, setDuration] = useState(5)
  const [isTrading, setIsTrading] = useState(false)
  const [tradeLogs, setTradeLogs] = useState<ManualTradeLog[]>([])
  const [connectionStatus, setConnectionStatus] = useState("Connecting...")
  const [stats, setStats] = useState({ wins: 0, losses: 0, totalProfit: 0 })

  // Load markets on mount
  useEffect(() => {
    if (isConnected && isAuthorized && apiClient) {
      loadMarkets()
    }
  }, [isConnected, isAuthorized, apiClient])

  // Update connection status
  useEffect(() => {
    if (isAuthorized) {
      setConnectionStatus("Connected ✅")
    } else if (isConnected) {
      setConnectionStatus("Authorizing...")
    } else {
      setConnectionStatus("Connecting...")
    }
  }, [isConnected, isAuthorized])

  const loadMarkets = async () => {
    try {
      // Try to load from cache first
      const cached = getCachedMarkets()
      if (cached && cached.length > 0) {
        setMarkets(cached)
        return
      }

      // Fetch from API if not cached
      if (!apiClient) return
      const symbols = await apiClient.getActiveSymbols()
      const volatilityMarkets = symbols.filter((s) => s.market === "synthetic_index" && s.symbol.startsWith("R_"))
      setMarkets(volatilityMarkets)
      setCachedMarkets(volatilityMarkets)
    } catch (error) {
      console.error("[v0] Error loading markets:", error)
    }
  }

  const executeTrade = async () => {
    if (!apiClient || !isAuthorized) {
      alert("Please wait for connection...")
      return
    }

    setIsTrading(true)

    try {
      // Clear old subscriptions
      await apiClient.forgetAll("proposal_open_contract")

      // Create proposal
      const proposal = await apiClient.getProposal({
        symbol: selectedMarket,
        contract_type: contractType,
        amount: stake,
        basis: "stake",
        duration: duration,
        duration_unit: "t",
        currency: currency,
      })

      // Buy contract
      const buy = await apiClient.buyContract(proposal.id, proposal.ask_price)
      const contractId = buy.contract_id
      const entryPrice = proposal.spot

      // Subscribe to contract updates
      await apiClient.subscribeProposalOpenContract(contractId, (contract) => {
        if (contract.status === "sold") {
          const profit = contract.profit || 0
          const result = profit > 0 ? "WIN" : "LOSS"
          const exitPrice = contract.exit_spot ? Number.parseFloat(contract.exit_spot) : entryPrice

          const tradeLog: ManualTradeLog = {
            id: contractId.toString(),
            time: new Date().toLocaleTimeString(),
            market: selectedMarket,
            type: contractType,
            entry: entryPrice,
            exit: exitPrice,
            stake: stake,
            payout: contract.payout || 0,
            profit: profit,
            result: result,
          }

          setTradeLogs((prev) => [tradeLog, ...prev])
          setStats((prev) => ({
            wins: prev.wins + (result === "WIN" ? 1 : 0),
            losses: prev.losses + (result === "LOSS" ? 1 : 0),
            totalProfit: prev.totalProfit + profit,
          }))

          setIsTrading(false)
        }
      })
    } catch (error) {
      console.error("[v0] Trade execution error:", error)
      alert("Trade failed: " + (error instanceof Error ? error.message : "Unknown error"))
      setIsTrading(false)
    }
  }

  return (
    <div className={`space-y-4 p-4 rounded-lg ${theme === "dark" ? "bg-[#0a0e27]/50" : "bg-gray-50"}`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          🎯 Manual Trading - SmartTrader
        </h3>
        <Badge className={connectionStatus.includes("✅") ? "bg-green-500" : "bg-yellow-500"}>{connectionStatus}</Badge>
      </div>

      {!isAuthorized && (
        <div
          className={`p-3 rounded-lg flex items-center gap-2 ${theme === "dark" ? "bg-yellow-500/10 border border-yellow-500/30" : "bg-yellow-50 border border-yellow-200"}`}
        >
          <AlertCircle className="w-4 h-4 text-yellow-500" />
          <span className={`text-sm ${theme === "dark" ? "text-yellow-400" : "text-yellow-700"}`}>
            Waiting for authorization...
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Market</Label>
          <Select value={selectedMarket} onValueChange={setSelectedMarket} disabled={isTrading || !isAuthorized}>
            <SelectTrigger
              className={`text-sm ${theme === "dark" ? "bg-[#0f1629]/50 border-blue-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {markets.map((m) => (
                <SelectItem key={m.symbol} value={m.symbol} className="text-sm">
                  {m.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Contract Type</Label>
          <Select value={contractType} onValueChange={setContractType} disabled={isTrading || !isAuthorized}>
            <SelectTrigger
              className={`text-sm ${theme === "dark" ? "bg-[#0f1629]/50 border-blue-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CALL" className="text-sm">
                Rise
              </SelectItem>
              <SelectItem value="PUT" className="text-sm">
                Fall
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
            Stake ({currency})
          </Label>
          <Input
            type="number"
            value={stake}
            onChange={(e) => setStake(Number.parseFloat(e.target.value))}
            disabled={isTrading || !isAuthorized}
            min="0.35"
            step="0.01"
            className={`text-sm ${theme === "dark" ? "bg-[#0f1629]/50 border-blue-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
          />
        </div>

        <div>
          <Label className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Duration (ticks)</Label>
          <Input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number.parseInt(e.target.value))}
            disabled={isTrading || !isAuthorized}
            min="1"
            max="100"
            className={`text-sm ${theme === "dark" ? "bg-[#0f1629]/50 border-blue-500/30 text-white" : "bg-white border-gray-300 text-gray-900"}`}
          />
        </div>
      </div>

      <Button
        onClick={executeTrade}
        disabled={isTrading || !isAuthorized}
        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold"
      >
        <Play className="w-4 h-4 mr-2" />
        {isTrading ? "Executing..." : "Buy Contract"}
      </Button>

      {tradeLogs.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className={`font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Trade History</h4>
            <div className="flex gap-2 text-xs">
              <Badge className="bg-green-500">Wins: {stats.wins}</Badge>
              <Badge className="bg-red-500">Losses: {stats.losses}</Badge>
              <Badge className={stats.totalProfit >= 0 ? "bg-blue-500" : "bg-red-500"}>
                P/L: {stats.totalProfit.toFixed(2)} {currency}
              </Badge>
            </div>
          </div>

          <div
            className={`max-h-64 overflow-y-auto rounded-lg border ${theme === "dark" ? "border-blue-500/20 bg-[#0f1629]/30" : "border-gray-200 bg-gray-50"}`}
          >
            <table className="w-full text-xs">
              <thead className={`sticky top-0 ${theme === "dark" ? "bg-[#0f1629]/50" : "bg-gray-100"}`}>
                <tr>
                  <th className={`p-2 text-left ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Time</th>
                  <th className={`p-2 text-left ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Market</th>
                  <th className={`p-2 text-left ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Entry</th>
                  <th className={`p-2 text-left ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Exit</th>
                  <th className={`p-2 text-left ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>P/L</th>
                  <th className={`p-2 text-left ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Result</th>
                </tr>
              </thead>
              <tbody>
                {tradeLogs.map((log) => (
                  <tr
                    key={log.id}
                    className={`border-t ${theme === "dark" ? "border-blue-500/10 hover:bg-[#0f1629]/50" : "border-gray-200 hover:bg-gray-100"}`}
                  >
                    <td className={`p-2 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>{log.time}</td>
                    <td className={`p-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>{log.market}</td>
                    <td className={`p-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                      {log.entry.toFixed(2)}
                    </td>
                    <td className={`p-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                      {log.exit.toFixed(2)}
                    </td>
                    <td className={`p-2 font-bold ${log.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {log.profit >= 0 ? "+" : ""}
                      {log.profit.toFixed(2)}
                    </td>
                    <td className={`p-2 font-bold ${log.result === "WIN" ? "text-green-400" : "text-red-400"}`}>
                      {log.result}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
