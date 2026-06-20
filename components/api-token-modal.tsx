"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Key, ExternalLink } from "lucide-react"

interface ApiTokenModalProps {
  open: boolean
  onSubmit: (token: string) => void
  theme?: "light" | "dark"
}

export function ApiTokenModal({ open, onSubmit, theme = "dark" }: ApiTokenModalProps) {
  const [tokenInput, setTokenInput] = useState("")

  const handleSubmit = () => {
    if (tokenInput.trim().length < 10) {
      alert("Please enter a valid API token (at least 10 characters)")
      return
    }
    onSubmit(tokenInput.trim())
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className={`sm:max-w-md ${theme === "dark" ? "bg-[#0a0e27] border-blue-500/30 text-white" : "bg-white border-gray-200"}`}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Enter Deriv API Token
            </div>
          </DialogTitle>
          <DialogDescription className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
            Please enter your Deriv API token to connect to the trading platform. This token will be stored securely in
            your browser.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="api-token" className={theme === "dark" ? "text-white" : "text-gray-900"}>
              API Token
            </Label>
            <Input
              id="api-token"
              type="password"
              placeholder="Enter your Deriv API token"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit()
              }}
              className={
                theme === "dark"
                  ? "bg-[#0f1629] border-blue-500/30 text-white placeholder:text-gray-500"
                  : "bg-white border-gray-300"
              }
            />
          </div>

          <div
            className={`text-sm p-3 rounded-lg ${theme === "dark" ? "bg-blue-500/10 border border-blue-500/30" : "bg-blue-50 border border-blue-200"}`}
          >
            <p className={`font-semibold mb-1 ${theme === "dark" ? "text-blue-400" : "text-blue-700"}`}>
              How to get your API token:
            </p>
            <ol
              className={`list-decimal list-inside space-y-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
            >
              <li>Go to Deriv.com and log in</li>
              <li>Navigate to Settings → API Token</li>
              <li>Create a new token with trading permissions</li>
              <li>Copy and paste it here</li>
            </ol>
            <a
              href="https://app.deriv.com/account/api-token"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 mt-2 text-sm font-medium ${theme === "dark" ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
            >
              Get API Token <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            onClick={handleSubmit}
            className="bg-blue-500 hover:bg-blue-600 text-white"
            disabled={tokenInput.trim().length < 10}
          >
            Connect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
