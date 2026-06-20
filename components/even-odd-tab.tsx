"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SignalAnalyzer } from "@/components/signal-analyzer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Zap, Settings, TrendingUp } from "lucide-react"

interface EvenOddRecord {
  timestamp: number
  number: number
  result: "even" | "odd"
  confidence: number
  won: boolean | null
}

interface EvenOddStats {
  total: number
  even: number
  odd: number
  winRate: number
  streak: number
  lastResult: "even" | "odd" | null
}

export function EvenOddTab() {
  const [records, setRecords] = useState<EvenOddRecord[]>([
    {
      timestamp: Date.now() - 20000,
      number: 2847,
      result: "odd",
      confidence: 0.92,
      won: true,
    },
    {
      timestamp: Date.now() - 15000,
      number: 2846,
      result: "even",
      confidence: 0.88,
      won: true,
    },
    {
      timestamp: Date.now() - 10000,
      number: 2845,
      result: "odd",
      confidence: 0.85,
      won: true,
    },
    {
      timestamp: Date.now() - 5000,
      number: 2844,
      result: "even",
      confidence: 0.78,
      won: false,
    },
  ])

  const [minConfidence, setMinConfidence] = useState(60)
  const [selectedRecord, setSelectedRecord] = useState<EvenOddRecord | null>(records[0] || null)

  const stats: EvenOddStats = useMemo(() => {
    if (records.length === 0) {
      return {
        total: 0,
        even: 0,
        odd: 0,
        winRate: 0,
        streak: 0,
        lastResult: null,
      }
    }

    const evenCount = records.filter((r) => r.result === "even").length
    const oddCount = records.filter((r) => r.result === "odd").length
    const wonCount = records.filter((r) => r.won === true).length
    const winRate = (wonCount / records.length) * 100

    let streak = 0
    for (let i = 0; i < records.length; i++) {
      if (records[i].won === true) {
        streak++
      } else {
        break
      }
    }

    return {
      total: records.length,
      even: evenCount,
      odd: oddCount,
      winRate,
      streak,
      lastResult: records[0]?.result || null,
    }
  }, [records])

  const filteredRecords = useMemo(
    () => records.filter((r) => r.confidence * 100 >= minConfidence),
    [records, minConfidence],
  )

  const handleAddRecord = (number: number, result: "even" | "odd") => {
    const newRecord: EvenOddRecord = {
      timestamp: Date.now(),
      number,
      result,
      confidence: 0.75 + Math.random() * 0.2,
      won: (number % 2 === 0 && result === "even") || (number % 2 !== 0 && result === "odd"),
    }
    setRecords([newRecord, ...records])
    setSelectedRecord(newRecord)
  }

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-6 bg-[#0f1629]/50 border border-blue-500/20">
        <TabsTrigger value="overview" className="data-[state=active]:text-cyan-400">
          <BarChart3 className="w-4 h-4 mr-1" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="predictions" className="data-[state=active]:text-cyan-400">
          <Zap className="w-4 h-4 mr-1" />
          Predictions
        </TabsTrigger>
        <TabsTrigger value="analysis" className="data-[state=active]:text-cyan-400">
          <TrendingUp className="w-4 h-4 mr-1" />
          Analysis
        </TabsTrigger>
        <TabsTrigger value="settings" className="data-[state=active]:text-cyan-400">
          <Settings className="w-4 h-4 mr-1" />
          Settings
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-purple-500/20">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-400 mb-2">Total Predictions</p>
              <p className="text-4xl font-bold text-purple-400">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-400 mb-2">Even Predictions</p>
              <p className="text-4xl font-bold text-blue-400">{stats.even}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-pink-500/20">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-400 mb-2">Odd Predictions</p>
              <p className="text-4xl font-bold text-pink-400">{stats.odd}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-green-500/20">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-400 mb-2">Win Rate</p>
              <p className="text-4xl font-bold text-green-400">{stats.winRate.toFixed(0)}%</p>
              <p className="text-xs text-green-300 mt-1">Streak: {stats.streak}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Add Predictions */}
        <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-white">Quick Add Prediction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Number</label>
              <Input
                type="number"
                placeholder="Enter number"
                id="quickNumber"
                className="bg-[#0a0e27]/50 border-blue-500/30 text-white placeholder:text-gray-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => {
                  const input = document.getElementById("quickNumber") as HTMLInputElement
                  if (input?.value) {
                    handleAddRecord(Number.parseInt(input.value), "even")
                    input.value = ""
                  }
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Predict Even
              </Button>
              <Button
                onClick={() => {
                  const input = document.getElementById("quickNumber") as HTMLInputElement
                  if (input?.value) {
                    handleAddRecord(Number.parseInt(input.value), "odd")
                    input.value = ""
                  }
                }}
                className="bg-pink-500 hover:bg-pink-600 text-white"
              >
                Predict Odd
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Predictions Tab */}
      <TabsContent value="predictions" className="space-y-4">
        <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-white">Recent Predictions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {records.map((record, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedRecord(record)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedRecord?.timestamp === record.timestamp
                      ? "border-cyan-400 bg-cyan-500/10"
                      : "border-blue-500/20 hover:border-blue-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{record.number}</p>
                      <p className="text-xs text-gray-400">{new Date(record.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`${
                          record.result === "even"
                            ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            : "bg-pink-500/20 text-pink-400 border-pink-500/30"
                        } border`}
                      >
                        {record.result.toUpperCase()}
                      </Badge>
                      <Badge
                        className={`${
                          record.won
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        } border`}
                      >
                        {record.won ? "WIN" : "LOSS"}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-gray-400">Confidence</span>
                      <span className="font-bold text-cyan-400">{(record.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1 bg-[#0a0e27]/50 rounded-full overflow-hidden border border-blue-500/20">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                        style={{ width: `${record.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Analysis Tab */}
      <TabsContent value="analysis" className="space-y-4">
        {selectedRecord && <SignalAnalyzer currentNumber={selectedRecord.number} showDetails={true} />}

        {/* Statistics */}
        <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-white">Pattern Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-gray-400 mb-2">Even/Odd Ratio</p>
                <p className="text-2xl font-bold text-blue-400">
                  {stats.even}:{stats.odd}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-gray-400 mb-2">Current Streak</p>
                <p className="text-2xl font-bold text-green-400">{stats.streak}</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs text-gray-400 mb-2">Distribution</p>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Even</span>
                    <span className="text-blue-400 font-bold">{((stats.even / stats.total) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-[#0a0e27]/50 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${(stats.even / stats.total) * 100}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Odd</span>
                    <span className="text-pink-400 font-bold">{((stats.odd / stats.total) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-[#0a0e27]/50 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-500" style={{ width: `${(stats.odd / stats.total) * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Settings Tab */}
      <TabsContent value="settings" className="space-y-4">
        <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-white">Filter Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <label className="text-sm text-gray-300">Minimum Confidence Level: {minConfidence}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
                className="w-full h-2 bg-[#0a0e27]/50 rounded-full cursor-pointer appearance-none"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm font-bold text-blue-400 mb-2">Active Predictions</p>
              <p className="text-2xl font-bold text-white">{filteredRecords.length}</p>
              <p className="text-xs text-gray-400 mt-1">of {records.length} total predictions match current filter</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
