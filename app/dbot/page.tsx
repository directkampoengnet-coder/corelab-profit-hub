"use client"

import { useEffect, useState } from "react"
import { useDerivAuth } from "@/hooks/use-deriv-auth"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

export default function DBotPage() {
  const { token, isLoggedIn, requestLogin } = useDerivAuth()
  const [iframeUrl, setIframeUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (token) {
      const dbotUrl = `https://bot.deriv.com?auth_token=${token}`
      setIframeUrl(dbotUrl)
      console.log("[v0] 🤖 Loading DBot with auth_token")
    }
  }, [token])

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#0f1629] to-[#1a1f3a] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border border-blue-500/20 rounded-xl p-8 text-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Login to access Deriv DBot</h2>
          </div>

          <Button
            onClick={requestLogin}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-lg transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] mb-4"
          >
            Login with Deriv
          </Button>

          <div className="pt-4 border-t border-blue-500/20">
            <p className="text-sm text-gray-400 mb-3">Don't have an account?</p>
            <a
              href="https://track.deriv.com/_1mHiO0UpCX6NhxmBqQyZL2Nd7ZgqdRLk/1/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              Create one
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#0a0e27] flex flex-col">
      {/* DBot Iframe - fills 100% of viewport */}
      <div className="flex-1 relative overflow-hidden">
        {!iframeUrl || isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0e27]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-lg">Loading DBot…</p>
            </div>
          </div>
        ) : null}

        {iframeUrl && (
          <iframe
            src={iframeUrl}
            className="w-full h-full border-0"
            title="Deriv DBot"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
            onLoad={() => {
              setIsLoading(false)
              console.log("[v0] ✅ DBot iframe loaded")
            }}
          />
        )}
      </div>
    </div>
  )
}
