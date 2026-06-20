"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"

export default function AdminPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("admin-token")
    if (token) setIsAuthenticated(true)
  }, [])

  const handleLogin = () => {
    setError("")
    if (username === "admin" && password === "#Admin@Profithub2026") {
      localStorage.setItem("admin-token", "authenticated")
      setIsAuthenticated(true)
    } else {
      setError("Invalid credentials")
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("admin-token")
    setIsAuthenticated(false)
    setUsername("")
    setPassword("")
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1629] to-[#1a1f3a] flex items-center justify-center p-4">
        <Card className="bg-[#0f1629]/80 border-blue-500/20 p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-white mb-6">Admin Login</h1>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
              className="bg-[#1a2235] border-blue-500/30 text-white placeholder:text-gray-500"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
              className="bg-[#1a2235] border-blue-500/30 text-white placeholder:text-gray-500"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button onClick={handleLogin} className="w-full bg-green-600 hover:bg-green-700">
              Login
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1629] to-[#1a1f3a] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700">
            Logout
          </Button>
        </div>

        <Tabs defaultValue="settings" className="w-full">
          <div className="border-b border-blue-500/20">
            <div className="flex gap-4">
              <TabsTrigger value="settings" className="text-white">
                Settings
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-white">
                Logs
              </TabsTrigger>
              <TabsTrigger value="help" className="text-white">
                Help
              </TabsTrigger>
            </div>
          </div>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <Card className="bg-[#0f1629]/80 border-blue-500/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Bot Configuration</h2>
              <p className="text-gray-400">Update bot strategies and settings for all traders here</p>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4 mt-4">
            <Card className="bg-[#0f1629]/80 border-blue-500/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">System Logs</h2>
              <p className="text-gray-400">View system logs, errors, and trade execution history</p>
            </Card>
          </TabsContent>

          <TabsContent value="help" className="space-y-4 mt-4">
            <Card className="bg-[#0f1629]/80 border-blue-500/20 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Help & Documentation</h2>
              <p className="text-gray-400">View documentation and troubleshooting guides</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
