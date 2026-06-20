"use client"

import { useState, useEffect } from "react"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { useDeriv } from "@/hooks/use-deriv"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface UserSettings {
  country: string
  email: string
  first_name: string
  last_name: string
  phone: string
  preferred_language: string
  residence: string
  salutation: string
  user_id: number
  balance: number
  currency: string
  account_type: string
}

export function UserSettingsPanel({ theme = "dark" }: { theme?: "light" | "dark" }) {
  const { accountInfo } = useDerivAuth()
  const { ws } = useDeriv()
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!ws) {
          setError("WebSocket not connected")
          return
        }

        const messageId = `settings_${Date.now()}`
        const settingsRequest = {
          get_settings: 1,
          req_id: messageId,
        }

        ws.send(JSON.stringify(settingsRequest))

        // Listen for response
        const handleMessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data)

            if (data.req_id === messageId && data.get_settings) {
              const settings = data.get_settings
              setUserSettings({
                country: settings.country || "N/A",
                email: settings.email || "N/A",
                first_name: settings.first_name || "N/A",
                last_name: settings.last_name || "N/A",
                phone: settings.phone || "N/A",
                preferred_language: settings.preferred_language || "EN",
                residence: settings.residence || "N/A",
                salutation: settings.salutation || "N/A",
                user_id: settings.user_id || 0,
                balance: accountInfo?.balance || 0,
                currency: accountInfo?.currency || "USD",
                account_type: accountInfo?.accountType || "Unknown",
              })
              ws.removeEventListener("message", handleMessage)
              setLoading(false)
            }
          } catch (err) {
            console.error("[v0] Error parsing settings response:", err)
          }
        }

        ws.addEventListener("message", handleMessage)

        // Cleanup after timeout
        const timeout = setTimeout(() => {
          ws.removeEventListener("message", handleMessage)
          setLoading(false)
        }, 5000)

        return () => clearTimeout(timeout)
      } catch (err) {
        console.error("[v0] Failed to fetch user settings:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch settings")
        setLoading(false)
      }
    }

    fetchUserSettings()
  }, [ws, accountInfo])

  if (loading) {
    return (
      <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-gray-100"}`}>
        <div className="text-center text-gray-500">Loading settings...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-red-900/30" : "bg-red-100"}`}>
        <div className={`text-sm ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>{error}</div>
      </div>
    )
  }

  if (!userSettings) {
    return (
      <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-gray-100"}`}>
        <div className="text-center text-gray-500">No settings available</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card
        className={`p-4 ${theme === "dark" ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20" : "bg-white border-gray-200"}`}
      >
        <h3 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          Personal Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>First Name</div>
            <div className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {userSettings.first_name}
            </div>
          </div>
          <div>
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Last Name</div>
            <div className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {userSettings.last_name}
            </div>
          </div>
          <div className="col-span-2">
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Email</div>
            <div className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {userSettings.email}
            </div>
          </div>
          <div>
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Phone</div>
            <div className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {userSettings.phone || "N/A"}
            </div>
          </div>
          <div>
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Country</div>
            <div className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {userSettings.country}
            </div>
          </div>
        </div>
      </Card>

      <Card
        className={`p-4 ${theme === "dark" ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-green-500/20" : "bg-white border-gray-200"}`}
      >
        <h3 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          Account Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Balance</div>
            <div className={`font-bold text-lg ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
              {userSettings.currency} {userSettings.balance.toFixed(2)}
            </div>
          </div>
          <div>
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Currency</div>
            <Badge className="mt-1">{userSettings.currency}</Badge>
          </div>
          <div>
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Account Type</div>
            <Badge className={userSettings.account_type === "Real" ? "bg-green-600" : "bg-yellow-600"}>
              {userSettings.account_type}
            </Badge>
          </div>
          <div>
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>User ID</div>
            <div className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {userSettings.user_id}
            </div>
          </div>
        </div>
      </Card>

      <Card
        className={`p-4 ${theme === "dark" ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-purple-500/20" : "bg-white border-gray-200"}`}
      >
        <h3 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>Preferences</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Preferred Language</div>
            <div className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {userSettings.preferred_language}
            </div>
          </div>
          <div>
            <div className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>Residence</div>
            <div className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {userSettings.residence}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
