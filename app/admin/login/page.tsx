"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Lock } from "lucide-react"

const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "#Admin@Profithub2026",
}

export default function AdminLoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      // Set admin session in localStorage
      localStorage.setItem(
        "admin_session",
        JSON.stringify({
          authenticated: true,
          timestamp: Date.now(),
        }),
      )
      console.log("[v0] Admin login successful")
      router.push("/admin/dashboard")
    } else {
      setError("Invalid username or password")
      console.log("[v0] Admin login failed - invalid credentials")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1629] to-[#1a1f3a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Profit Hub Admin
            </CardTitle>
            <CardDescription className="text-gray-400">Secure Administration Panel</CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Username</label>
                <Input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="bg-[#0a0e27]/50 border-blue-500/30 text-white placeholder:text-gray-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Password</label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="bg-[#0a0e27]/50 border-blue-500/30 text-white placeholder:text-gray-600"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-2 shadow-[0_0_20px_rgba(34,211,238,0.5)]"
              >
                {isLoading ? "Logging in..." : "Login to Admin Panel"}
              </Button>
            </form>

            <div className="mt-6 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-gray-400 text-center">
                This is a secure admin area. Unauthorized access is prohibited.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
