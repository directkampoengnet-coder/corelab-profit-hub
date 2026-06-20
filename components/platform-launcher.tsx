"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PlatformLauncherProps {
  title: string
  description: string
  platformUrl: string
  isAuthenticated: boolean
  icon?: React.ReactNode
  features?: string[]
  theme?: "light" | "dark"
}

export function PlatformLauncher({
  title,
  description,
  platformUrl,
  isAuthenticated,
  icon,
  features = [],
  theme = "dark",
}: PlatformLauncherProps) {
  const handleLaunch = () => {
    window.open(platformUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <div className={`space-y-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
      <Alert className={theme === "dark" ? "bg-blue-950/50 border-blue-800" : "bg-blue-50 border-blue-200"}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className={theme === "dark" ? "text-blue-200" : "text-blue-800"}>
          Due to security restrictions, Deriv platforms cannot be embedded directly. Click the button below to open{" "}
          {title} in a new window with your authentication.
        </AlertDescription>
      </Alert>

      <Card className={theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}>
        <CardHeader>
          <div className="flex items-center gap-3">
            {icon && <div className="text-red-500">{icon}</div>}
            <div>
              <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>{title}</CardTitle>
              <CardDescription className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                {description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {features.length > 0 && (
            <div className="space-y-2">
              <h4 className={`font-semibold text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Key Features:
              </h4>
              <ul className={`space-y-1 text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button
            onClick={handleLaunch}
            disabled={!isAuthenticated}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open {title}
            {isAuthenticated ? " (Authenticated)" : " (Login Required)"}
          </Button>

          {!isAuthenticated && (
            <p className={`text-sm text-center ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Please login with your Deriv account above to access this platform
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
