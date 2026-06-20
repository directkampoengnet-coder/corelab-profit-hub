"use client"

import { useState } from "react"
import { DerivHeader, tabs, type DerivTab } from "@/components/deriv-header"
import { DerivAuth } from "@/components/deriv-auth"
import { useDerivAuth } from "@/hooks/use-deriv-auth"

interface DerivPlatformsTabProps {
  theme?: "light" | "dark"
}

export function DerivPlatformsTab({ theme = "dark" }: DerivPlatformsTabProps) {
  const [activeTab, setActiveTab] = useState<DerivTab>(tabs[0])
  const { token } = useDerivAuth()

  const iframeUrl = token ? `${activeTab.url}&token=${token}` : activeTab.url

  return (
    <div className={`h-screen flex flex-col ${theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}>
      <DerivAuth theme={theme} />
      <DerivHeader activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} />

      <div className="flex-1 p-4">
        <div
          className={`w-full h-full rounded-2xl shadow-lg overflow-hidden ${
            theme === "dark" ? "bg-gray-800" : "bg-gray-50"
          }`}
        >
          <iframe
            key={activeTab.id} // Force reload when tab changes
            src={iframeUrl}
            title={activeTab.name}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
          />
        </div>
      </div>
    </div>
  )
}
