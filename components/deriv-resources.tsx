"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLink, Github, BookOpen } from "lucide-react"
import { DERIV_REPOS } from "@/lib/deriv-config"

interface DerivResourcesProps {
  theme?: "light" | "dark"
}

export function DerivResources({ theme = "dark" }: DerivResourcesProps) {
  const repos = Object.values(DERIV_REPOS)

  return (
    <Card className={theme === "dark" ? "bg-[#0f1629]/80 border-blue-500/20" : "bg-white border-gray-200"}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Github className={`h-5 w-5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
          <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>
            Official Deriv GitHub Repositories
          </CardTitle>
        </div>
        <CardDescription className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
          Verified public repositories used for platform integration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {repos.map((repo) => (
            <div
              key={repo.name}
              className={`p-4 rounded-lg border ${
                theme === "dark" ? "bg-gray-800/50 border-gray-700/50" : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {repo.name}
                    </h3>
                    <Badge
                      variant="outline"
                      className={
                        theme === "dark" ? "border-blue-500/30 text-blue-400" : "border-blue-300 text-blue-600"
                      }
                    >
                      {repo.branch}
                    </Badge>
                  </div>
                  <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"} mb-2`}>
                    {repo.description}
                  </p>
                  <div
                    className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-500"} bg-gray-900/20 p-2 rounded border ${theme === "dark" ? "border-gray-700" : "border-gray-300"}`}
                  >
                    <span className="font-semibold">Integration: </span>
                    {repo.integration}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className={
                    theme === "dark" ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"
                  }
                  onClick={() => window.open(repo.url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <code
                  className={`text-xs px-2 py-1 rounded ${theme === "dark" ? "bg-gray-900/50 text-gray-300" : "bg-gray-200 text-gray-700"} flex-1`}
                >
                  {repo.url}
                </code>
              </div>
            </div>
          ))}
        </div>

        <div
          className={`mt-6 p-4 rounded-lg border ${theme === "dark" ? "bg-blue-500/10 border-blue-500/30" : "bg-blue-50 border-blue-200"}`}
        >
          <div className="flex items-start gap-3">
            <BookOpen className={`h-5 w-5 mt-0.5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
            <div>
              <h4 className={`font-semibold mb-1 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                Integration Notes
              </h4>
              <ul className={`text-sm space-y-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                <li>• All platforms are integrated via iframe embedding with OAuth authentication</li>
                <li>• WebSocket API (deriv-api) is used for real-time data and account management</li>
                <li>• App ID 106629 is configured for this application</li>
                <li>• Derivatives engine is optional unless implementing custom backend trading logic</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
