"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw } from "lucide-react"

interface SettingsPanelProps {
  onReset?: () => void
}

export function SettingsPanel({ onReset }: SettingsPanelProps) {
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-white">Market Settings</CardTitle>
          <CardDescription>Configure market data and analysis parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-refresh" className="text-white">
              Auto-refresh Data
            </Label>
            <Switch id="auto-refresh" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications" className="text-white">
              Signal Notifications
            </Label>
            <Switch id="notifications" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-white">Appearance</CardTitle>
          <CardDescription>Customize the look and feel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme" className="text-white">
              Theme
            </Label>
            <Select defaultValue="dark">
              <SelectTrigger id="theme" className="bg-[#0f1629]/50 border-blue-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0a0e27] border-blue-500/30">
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-white">Analysis Controls</CardTitle>
          <CardDescription>Reset and manage analysis data</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onReset}
            variant="outline"
            className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Market Data
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-white">Current Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Version:</span>
            <span className="text-white">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">API Status:</span>
            <span className="text-green-400">Connected</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Data Source:</span>
            <span className="text-white">Deriv WebSocket API</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
