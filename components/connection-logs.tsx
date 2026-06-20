"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Trash2 } from "lucide-react"
import type { ConnectionLog } from "@/lib/deriv-websocket"

interface ConnectionLogsProps {
  logs: ConnectionLog[]
  onClear?: () => void
}

export function ConnectionLogs({ logs, onClear }: ConnectionLogsProps) {
  const [copied, setCopied] = useState(false)

  const copyLogs = () => {
    const logText = logs
      .map((log) => `[${log.type.toUpperCase()}] ${log.timestamp.toLocaleTimeString()} - ${log.message}`)
      .join("\n")
    navigator.clipboard.writeText(logText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const stats = {
    total: logs.length,
    errors: logs.filter((l) => l.type === "error").length,
    warnings: logs.filter((l) => l.type === "warning").length,
    info: logs.filter((l) => l.type === "info").length,
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Connection Logs</CardTitle>
              <CardDescription>Real-time WebSocket connection events and API responses</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyLogs}
                className="border-blue-500/30 text-white hover:bg-blue-500/10 bg-transparent"
              >
                <Copy className="h-4 w-4 mr-2" />
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClear}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-[#0a0e27] rounded-lg p-4 max-h-[400px] overflow-y-auto space-y-2">
            {logs.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No logs yet</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="flex items-start gap-3 text-sm">
                  <Badge
                    className={`${
                      log.type === "error"
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : log.type === "warning"
                          ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    }`}
                  >
                    {log.type.toUpperCase()}
                  </Badge>
                  <span className="text-gray-400 text-xs">{log.timestamp.toLocaleTimeString()}</span>
                  <span className="text-white flex-1">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-blue-400 mb-2">{stats.total}</div>
            <div className="text-sm text-gray-400">Total Events</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-500/30">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-red-400 mb-2">{stats.errors}</div>
            <div className="text-sm text-gray-400">Errors</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-yellow-400 mb-2">{stats.warnings}</div>
            <div className="text-sm text-gray-400">Warnings</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
          <CardContent className="pt-6 text-center">
            <div className="text-4xl font-bold text-cyan-400 mb-2">{stats.info}</div>
            <div className="text-sm text-gray-400">Info</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
