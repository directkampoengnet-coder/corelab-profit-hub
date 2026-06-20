"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, Settings, AlertCircle, HelpCircle } from "lucide-react"

interface AdminSession {
  authenticated: boolean
  timestamp: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const sessionData = localStorage.getItem("admin_session")
    if (sessionData) {
      try {
        const session: AdminSession = JSON.parse(sessionData)
        if (session.authenticated) {
          setIsAuthenticated(true)
          setIsLoading(false)
          console.log("[v0] Admin session verified")
          return
        }
      } catch (error) {
        console.error("[v0] Failed to parse admin session:", error)
      }
    }

    // Not authenticated, redirect to login
    router.push("/admin/login")
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("admin_session")
    console.log("[v0] Admin logged out")
    router.push("/admin/login")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1629] to-[#1a1f3a] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
          <p className="text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1629] to-[#1a1f3a]">
      <header className="border-b border-blue-500/20 bg-[#0a0e27]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Profit Hub Admin Panel
          </h1>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-[#0f1629]/50 border border-blue-500/20">
            <TabsTrigger value="settings" className="data-[state=active]:text-cyan-400">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:text-cyan-400">
              <AlertCircle className="w-4 h-4 mr-2" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="help" className="data-[state=active]:text-cyan-400">
              <HelpCircle className="w-4 h-4 mr-2" />
              Help
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-white">System Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h3 className="font-bold text-white mb-2">Bot Strategies Configuration</h3>
                    <p className="text-sm text-gray-400 mb-4">Update trading strategies for all traders</p>
                    <Button className="bg-cyan-500 hover:bg-cyan-600 text-white">Edit Strategies</Button>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h3 className="font-bold text-white mb-2">System Status</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">API Connection:</span>
                        <span className="text-green-400 font-bold">Connected</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Database Status:</span>
                        <span className="text-green-400 font-bold">Operational</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Active Traders:</span>
                        <span className="text-blue-400 font-bold">1</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h3 className="font-bold text-white mb-2">Maintenance</h3>
                    <Button
                      variant="outline"
                      className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 bg-transparent"
                    >
                      Clear Cache
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-white">System Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-[#0a0e27]/50 rounded-lg p-4 font-mono text-xs text-gray-400 max-h-96 overflow-y-auto">
                  <div>[2025-01-14 10:30:45] System initialized</div>
                  <div>[2025-01-14 10:30:46] Database connection established</div>
                  <div>[2025-01-14 10:30:47] API socket connected</div>
                  <div>[2025-01-14 10:30:48] Admin user authenticated</div>
                  <div className="text-green-400">[2025-01-14 10:30:49] All systems operational</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Help Tab */}
          <TabsContent value="help">
            <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-white">Help & Documentation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h3 className="font-bold text-white mb-2">Getting Started</h3>
                    <p className="text-sm text-gray-400">
                      This admin panel allows you to configure bot strategies and monitor system health. Use the
                      Settings tab to update trading parameters.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h3 className="font-bold text-white mb-2">Bot Strategies</h3>
                    <p className="text-sm text-gray-400">
                      Available strategies: Even/Odd, Over/Under, Differs, Rise/Fall. Each strategy has configurable
                      parameters for signal generation and risk management.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <h3 className="font-bold text-white mb-2">Support</h3>
                    <p className="text-sm text-gray-400">Email: mbuguabenson2020@gmail.com | WhatsApp: +254757722344</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
