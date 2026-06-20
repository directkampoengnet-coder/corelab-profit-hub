"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface TPSLModalProps {
  isOpen: boolean
  type: "tp" | "sl"
  amount: number
  currency: string
  onClose: () => void
}

const KES_RATE = 130 // 1 USD = 130 KES (approximate current rate)

export function TPSLModal({ isOpen, type, amount, currency, onClose }: TPSLModalProps) {
  const [amountInKES, setAmountInKES] = useState(0)

  useEffect(() => {
    setAmountInKES(amount * KES_RATE)
  }, [amount])

  if (!isOpen) return null

  const isTP = type === "tp"
  const bgColor = isTP ? "from-green-500/20 to-green-600/20" : "from-red-500/20 to-red-600/20"
  const borderColor = isTP ? "border-green-500/50" : "border-red-500/50"
  const textColor = isTP ? "text-green-400" : "text-red-400"
  const buttonColor = isTP ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className={`bg-gradient-to-br ${bgColor} border ${borderColor} rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-2xl font-bold ${textColor}`}>{isTP ? "Congratulations!" : "Stop Loss Hit"}</h2>
          <button onClick={onClose} className={`p-1 hover:bg-white/10 rounded transition-colors ${textColor}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">{isTP ? "Dollars Printed Successfully" : "Loss Amount"}</p>
            <p className={`text-4xl font-bold ${textColor}`}>${amount.toFixed(2)}</p>
            <p className="text-gray-500 text-xs mt-1">{currency}</p>
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="text-gray-400 text-sm mb-2">Equivalent in Kenyan Shillings</p>
            <p className={`text-3xl font-bold ${textColor}`}>KES {amountInKES.toFixed(2)}</p>
            <p className="text-gray-500 text-xs mt-1">(at ~{KES_RATE} KES per USD)</p>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            onClick={onClose}
            className={`w-full ${buttonColor} text-white font-bold py-2 rounded-lg transition-colors`}
          >
            {isTP ? "Continue Trading" : "Acknowledge"}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full border-white/20 text-gray-300 hover:bg-white/5 font-bold py-2 rounded-lg bg-transparent"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
