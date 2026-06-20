"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { Play, Square } from "lucide-react"

export function KillerMarketScannerTab() {
  const { isLoggedIn } = useDerivAuth()
  const [isScanning, setIsScanning] = useState(false)
  const [tickWindow, setTickWindow] = useState(100)
  const [threshold, setThreshold] = useState(60)
  const [strategies, setStrategies] = useState({
    even: true,
    odd: true,
    over: true,
    under: true,
    differs: true,
  })

  if (!isLoggedIn) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Please log in to access Market Scanner</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle>Scanner Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Tick Window</label>
            <Select value={String(tickWindow)} onValueChange={(v) => setTickWindow(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 Ticks</SelectItem>
                <SelectItem value="50">50 Ticks</SelectItem>
                <SelectItem value="100">100 Ticks</SelectItem>
                <SelectItem value="200">200 Ticks</SelectItem>
                <SelectItem value="500">500 Ticks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Dominance Threshold: {threshold}%</label>
            <Slider value={[threshold]} onValueChange={(v) => setThreshold(v[0])} min={55} max={75} step={1} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium block">Enabled Strategies</label>
            {Object.entries(strategies).map(([key, value]) => (
              <div key={key} className="flex items-center space-x-2">
                <Checkbox
                  id={key}
                  checked={value}
                  onCheckedChange={(checked) => setStrategies((prev) => ({ ...prev, [key]: checked === true }))}
                />
                <label htmlFor={key} className="text-sm capitalize cursor-pointer">
                  {key}
                </label>
              </div>
            ))}
          </div>

          <Button
            onClick={() => setIsScanning(!isScanning)}
            className="w-full"
            variant={isScanning ? "destructive" : "default"}
          >
            {isScanning ? (
              <>
                <Square className="mr-2 h-4 w-4" />
                Stop Scanner
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Scanner
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {isScanning && (
        <div className="text-center p-8">
          <Badge variant="outline" className="text-lg px-4 py-2 animate-pulse">
            Scanning all markets...
          </Badge>
        </div>
      )}
    </div>
  )
}
