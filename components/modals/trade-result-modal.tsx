"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle, AlertCircle, X } from "lucide-react"

interface TradeResultModalProps {
  isOpen: boolean
  type: "tp" | "sl"
  amount: number
  theme: "light" | "dark"
  onClose: () => void
}

export function TradeResultModal({ isOpen, type, amount, theme, onClose }: TradeResultModalProps) {
  const [isVisible, setIsVisible] = useState(isOpen)

  useEffect(() => {
    setIsVisible(isOpen)
    if (isOpen) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, onClose])

  if (!isVisible) return null

  const isSuccess = type === "tp"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => {
          setIsVisible(false)
          onClose()
        }}
      />

      {/* Modal */}
      <Card
        className={`relative w-full max-w-md p-8 border-2 ${
          isSuccess
            ? theme === "dark"
              ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/50 shadow-[0_0_50px_rgba(34,197,94,0.4)]"
              : "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-[0_0_50px_rgba(34,197,94,0.2)]"
            : theme === "dark"
              ? "bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.4)]"
              : "bg-gradient-to-br from-red-50 to-orange-50 border-red-300 shadow-[0_0_50px_rgba(239,68,68,0.2)]"
        }`}
      >
        <button
          onClick={() => {
            setIsVisible(false)
            onClose()
          }}
          className={`absolute top-4 right-4 p-1 rounded-full transition-colors ${
            theme === "dark"
              ? "hover:bg-white/10 text-gray-400 hover:text-white"
              : "hover:bg-black/10 text-gray-600 hover:text-gray-900"
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          {isSuccess ? (
            <>
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-16 h-16 text-green-500 animate-bounce" />
              </div>
              <h2 className={`text-3xl font-bold mb-2 ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
                Congratulations!
              </h2>
              <p className={`text-lg mb-4 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                Target Profit Reached
              </p>
              <div className={`text-4xl font-bold mb-6 ${theme === "dark" ? "text-green-400" : "text-green-600"}`}>
                ${amount.toFixed(2)}
              </div>
              <p className={`text-sm mb-6 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Printed successfully
              </p>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <AlertCircle className="w-16 h-16 text-red-500 animate-pulse" />
              </div>
              <h2 className={`text-3xl font-bold mb-2 ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>Oops!</h2>
              <p className={`text-lg mb-4 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>Max Loss Reached</p>
              <div className={`text-4xl font-bold mb-6 ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
                ${amount.toFixed(2)}
              </div>
              <p className={`text-sm mb-6 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Please try again later
              </p>
            </>
          )}

          <Button
            onClick={() => {
              setIsVisible(false)
              onClose()
            }}
            className={`w-full ${
              isSuccess
                ? theme === "dark"
                  ? "bg-green-500 hover:bg-green-600 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
                : theme === "dark"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {isSuccess ? "Continue Trading" : "Restart"}
          </Button>
        </div>
      </Card>
    </div>
  )
}
