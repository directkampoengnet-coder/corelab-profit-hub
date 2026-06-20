"use client"

import { useState, useEffect, useRef } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { useDerivAuth } from "@/hooks/use-deriv-auth"

interface LoadingStep {
  id: string
  label: string
  status: "pending" | "loading" | "complete"
}

interface LoadingScreenProps {
  onComplete: () => void
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const progressRef = useRef(0)
  const animationFrameRef = useRef<number>()
  const [steps, setSteps] = useState<LoadingStep[]>([
    { id: "connect", label: "Connecting to Deriv API", status: "pending" },
    { id: "markets", label: "Initializing market data", status: "pending" },
    { id: "servers", label: "Setting up data from servers", status: "pending" },
    { id: "account", label: "Connecting accounts", status: "pending" },
    { id: "finalize", label: "Finalizing setup", status: "pending" },
  ])

  const { connectionStatus } = useDerivAuth()

  const smoothProgress = (from: number, to: number, duration: number) => {
    return new Promise<void>((resolve) => {
      const startTime = performance.now()

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)

        // Easing function for smooth animation
        const easeOutCubic = 1 - Math.pow(1 - progress, 3)
        const currentValue = from + (to - from) * easeOutCubic

        progressRef.current = currentValue
        setProgress(Math.round(currentValue))

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate)
        } else {
          resolve()
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    })
  }

  useEffect(() => {
    const loadingSequence = async () => {
      try {
        // Step 1: Connecting
        setSteps((prev) => prev.map((s, i) => (i === 0 ? { ...s, status: "loading" } : s)))

        let connectionCheckCount = 0
        const maxChecks = 30

        while (connectionStatus !== "connected" && connectionCheckCount < maxChecks) {
          await new Promise((resolve) => setTimeout(resolve, 500))
          connectionCheckCount++
          const targetProgress = Math.min(Math.floor((connectionCheckCount / maxChecks) * 30), 30)
          if (targetProgress > progressRef.current) {
            await smoothProgress(progressRef.current, targetProgress, 400)
          }
        }

        if (connectionStatus !== "connected") {
          throw new Error("Failed to connect to Deriv API. Please check your internet connection.")
        }

        await smoothProgress(progressRef.current, 30, 300)
        setSteps((prev) => prev.map((s, i) => (i === 0 ? { ...s, status: "complete" } : s)))

        // Step 2: Initialize market data
        setSteps((prev) => prev.map((s, i) => (i === 1 ? { ...s, status: "loading" } : s)))
        await smoothProgress(30, 50, 800)
        setSteps((prev) => prev.map((s, i) => (i === 1 ? { ...s, status: "complete" } : s)))

        // Step 3: Setting up servers
        setSteps((prev) => prev.map((s, i) => (i === 2 ? { ...s, status: "loading" } : s)))
        await smoothProgress(50, 70, 900)
        setSteps((prev) => prev.map((s, i) => (i === 2 ? { ...s, status: "complete" } : s)))

        // Step 4: Connecting accounts
        setSteps((prev) => prev.map((s, i) => (i === 3 ? { ...s, status: "loading" } : s)))
        await smoothProgress(70, 85, 700)
        setSteps((prev) => prev.map((s, i) => (i === 3 ? { ...s, status: "complete" } : s)))

        // Step 5: Finalizing
        setSteps((prev) => prev.map((s, i) => (i === 4 ? { ...s, status: "loading" } : s)))
        await smoothProgress(85, 100, 600)
        setSteps((prev) => prev.map((s, i) => (i === 4 ? { ...s, status: "complete" } : s)))

        await new Promise((resolve) => setTimeout(resolve, 400))
        onComplete()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize application")
      }
    }

    loadingSequence()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [onComplete, connectionStatus])

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 liquid-bg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="w-full max-w-md">
          <div className="glass-frost rounded-2xl p-6 sm:p-8 glow-border">
            <div className="text-center mb-6">
              <div className="text-5xl sm:text-6xl mb-4 animate-pulse">⚠️</div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">Initialization Failed</h2>
              <p className="text-red-300 text-sm sm:text-base">{error}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold transition-all btn-touch shadow-lg hover:shadow-red-500/25"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0f172a] to-slate-900">
        {/* Animated gradient orbs */}
        <div
          className="absolute top-1/4 left-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "4s" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-64 sm:w-96 h-64 sm:h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "5s", animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 sm:w-72 h-48 sm:h-72 bg-emerald-500/15 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: "6s", animationDelay: "2s" }}
        />

        {/* Glowing lines */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent animate-pulse" />
        <div
          className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-0 left-0 h-full w-px bg-gradient-to-b from-transparent via-emerald-500/30 to-transparent animate-pulse"
          style={{ animationDelay: "0.5s" }}
        />
        <div
          className="absolute top-0 right-0 h-full w-px bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent animate-pulse"
          style={{ animationDelay: "1.5s" }}
        />
      </div>

      <div className="relative w-full max-w-lg sm:max-w-xl z-10">
        {/* Logo & Title - Frost Glass Container */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="relative inline-block mb-4">
            {/* Glowing ring around logo */}
            <div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 blur-xl opacity-60 animate-pulse"
              style={{ animationDuration: "2s" }}
            />
            <div
              className="relative text-5xl sm:text-6xl md:text-7xl font-bold"
              style={{ filter: "drop-shadow(0 0 30px rgba(16, 185, 129, 0.6))" }}
            >
              💰
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
            Profit Hub
          </h1>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg mb-1 px-4">
            Smart Analysis, High Accuracy Signals, Trading Automation
          </p>
          <p className="text-gray-500 text-xs sm:text-sm">Setting up your trading environment...</p>
        </div>

        <div className="glass-frost rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6 glow-border">
          {/* Progress Bar with continuous smooth animation */}
          <div className="relative h-3 sm:h-4 bg-slate-800/50 rounded-full overflow-hidden mb-3 sm:mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-700/30 to-slate-600/30" />
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-cyan-400 to-teal-500 rounded-full transition-none progress-glow"
              style={{
                width: `${progress}%`,
                transition: "none",
              }}
            >
              {/* Shimmer effect on progress bar */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                style={{
                  backgroundSize: "200% 100%",
                  animation: "shimmer 2s linear infinite",
                }}
              />
            </div>
          </div>

          <div className="text-center">
            <span className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              {progress}%
            </span>
          </div>
        </div>

        {/* Loading Steps - Frost Glass Card */}
        <div className="glass-frost rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Initialization Progress</h3>
          <div className="space-y-2 sm:space-y-3">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl transition-all duration-300 ${
                  step.status === "loading"
                    ? "bg-emerald-500/10 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                    : step.status === "complete"
                      ? "bg-emerald-500/5 border border-emerald-500/20"
                      : "bg-slate-800/30 border border-slate-700/30"
                }`}
              >
                <div className="flex-shrink-0">
                  {step.status === "complete" ? (
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  ) : step.status === "loading" ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-slate-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs sm:text-sm font-medium truncate ${
                      step.status === "loading"
                        ? "text-emerald-400"
                        : step.status === "complete"
                          ? "text-gray-400"
                          : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
                {step.status === "loading" && (
                  <span className="text-xs text-emerald-400 font-semibold animate-pulse flex-shrink-0">Loading...</span>
                )}
                {step.status === "complete" && (
                  <span className="text-xs text-emerald-400 font-semibold flex-shrink-0">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact - Compact Frost Card */}
        <div className="glass-frost rounded-2xl p-3 sm:p-4 mb-4">
          <h3 className="text-sm sm:text-base font-bold text-white mb-2 sm:mb-3 text-center">Contact & Support</h3>
          <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="text-center sm:text-left">
              <span className="text-gray-400 block">Email</span>
              <span className="text-cyan-400 font-medium text-xs">mbuguabenson2020@gmail.com</span>
            </div>
            <div className="text-center sm:text-right">
              <span className="text-gray-400 block">WhatsApp</span>
              <span className="text-cyan-400 font-medium">+254757722344</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700/50 text-center">
            <span className="text-emerald-400 font-medium text-xs sm:text-sm">24/7 Support Available</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">© 2025 Profit Hub. All rights reserved.</p>
          <p className="text-xs text-gray-600 mt-1">Trading involves risk. Use signals responsibly.</p>
        </div>
      </div>
    </div>
  )
}
