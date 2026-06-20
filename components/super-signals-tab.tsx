"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SignalAnalyzer } from "@/components/signal-analyzer"
import { Badge } from "@/components/ui/badge"
import { Zap, TrendingUp, Target, AlertTriangle } from "lucide-react"

interface SuperSignal {
  timestamp: number
  value: number
  strength: "strong" | "medium" | "weak"
  type: "bullish" | "bearish" | "neutral"
  confidence: number
}

export function SuperSignalsTab() {
  const [superSignals, setSuperSignals] = useState<SuperSignal[]>([])
  const [selectedSignal, setSelectedSignal] = useState<SuperSignal | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const mockSignals: SuperSignal[] = [
      {
        timestamp: Date.now() - 5000,
        value: 2847,
        strength: "strong",
        type: "bullish",
        confidence: 0.92,
      },
      {
        timestamp: Date.now() - 10000,
        value: 2845,
        strength: "medium",
        type: "bullish",
        confidence: 0.78,
      },
      {
        timestamp: Date.now() - 15000,
        value: 2841,
        strength: "weak",
        type: "neutral",
        confidence: 0.55,
      },
      {
        timestamp: Date.now() - 20000,
        value: 2839,
        strength: "strong",
        type: "bearish",
        confidence: 0.85,
      },
      {
        timestamp: Date.now() - 25000,
        value: 2835,
        strength: "medium",
        type: "bullish",
        confidence: 0.72,
      },
    ]
    setSuperSignals(mockSignals)
    setSelectedSignal(mockSignals[0])
    setIsLoading(false)
  }, [])

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "strong":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "bullish":
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case "bearish":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
          <p className="text-gray-400">Loading super signals...</p>
        </div>
      </div>
    )
  }

  return (
    <Tabs defaultValue="live" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6 bg-[#0f1629]/50 border border-blue-500/20">
        <TabsTrigger value="live" className="data-[state=active]:text-cyan-400">
          <Zap className="w-4 h-4 mr-2" />
          Live Signals
        </TabsTrigger>
        <TabsTrigger value="analysis" className="data-[state=active]:text-cyan-400">
          <Target className="w-4 h-4 mr-2" />
          Analysis
        </TabsTrigger>
        <TabsTrigger value="history" className="data-[state=active]:text-cyan-400">
          <TrendingUp className="w-4 h-4 mr-2" />
          History
        </TabsTrigger>
      </TabsList>

      {/* Live Signals Tab */}
      <TabsContent value="live" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Signal List */}
          <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Super Signals Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {superSignals.map((signal, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedSignal(signal)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedSignal?.timestamp === signal.timestamp
                        ? "border-cyan-400 bg-cyan-500/10"
                        : getTypeColor(signal.type)
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white">{signal.value}</span>
                      <Badge className={`${getStrengthColor(signal.strength)} border`}>
                        {signal.strength.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{new Date(signal.timestamp).toLocaleTimeString()}</span>
                      <span className="font-bold">{(signal.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Signal Details */}
          {selectedSignal && (
            <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-white">Selected Signal Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-[#0a0e27]/50 border border-blue-500/20">
                    <p className="text-xs text-gray-400 mb-1">Value</p>
                    <p className="text-3xl font-bold text-cyan-400">{selectedSignal.value}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-lg bg-[#0a0e27]/50 border border-blue-500/20">
                      <p className="text-xs text-gray-400 mb-1">Type</p>
                      <Badge className={`${getTypeColor(selectedSignal.type)} border`}>
                        {selectedSignal.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="p-3 rounded-lg bg-[#0a0e27]/50 border border-blue-500/20">
                      <p className="text-xs text-gray-400 mb-1">Strength</p>
                      <Badge className={`${getStrengthColor(selectedSignal.strength)} border`}>
                        {selectedSignal.strength.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0a0e27]/50 border border-blue-500/20">
                    <p className="text-xs text-gray-400 mb-2">Confidence Score</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-[#0a0e27]/50 rounded-full overflow-hidden border border-blue-500/20">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          style={{
                            width: `${selectedSignal.confidence * 100}%`,
                          }}
                        />
                      </div>
                      <span className="font-bold text-cyan-400 min-w-fit">
                        {(selectedSignal.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-xs text-gray-400 mb-1">Timestamp</p>
                    <p className="text-sm text-blue-400">{new Date(selectedSignal.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </TabsContent>

      {/* Analysis Tab */}
      <TabsContent value="analysis" className="space-y-4">
        {selectedSignal && (
          <>
            <SignalAnalyzer currentNumber={selectedSignal.value} showDetails={true} />
            <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Risk Level</span>
                    <span className="font-bold text-orange-400">
                      {selectedSignal.strength === "strong" ? "HIGH" : "MEDIUM"}
                    </span>
                  </div>
                  <div className="h-2 bg-[#0a0e27]/50 rounded-full overflow-hidden border border-blue-500/20">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                      style={{
                        width: selectedSignal.strength === "strong" ? "80%" : "50%",
                      }}
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-400 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  {selectedSignal.confidence > 0.8
                    ? "⚠️ High confidence signal - Monitor closely"
                    : "⚠️ Medium confidence - Exercise caution"}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>

      {/* History Tab */}
      <TabsContent value="history" className="space-y-4">
        <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-white">Signal History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {superSignals.map((signal, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg border border-blue-500/20 bg-[#0a0e27]/50 hover:bg-[#0a0e27]/80 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Value</p>
                        <p className="text-lg font-bold text-cyan-400">{signal.value}</p>
                      </div>
                      <div>
                        <Badge className={`${getTypeColor(signal.type)} border mb-1`}>{signal.type}</Badge>
                        <p className="text-xs text-gray-400">{new Date(signal.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={`${getStrengthColor(signal.strength)} border mb-1`}>{signal.strength}</Badge>
                      <p className="text-sm font-bold text-cyan-400">{(signal.confidence * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
