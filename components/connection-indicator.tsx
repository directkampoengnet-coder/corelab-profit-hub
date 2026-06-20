"use client"

import { motion } from "framer-motion"

interface ConnectionIndicatorProps {
  status: "connected" | "disconnected" | "reconnecting"
}

export function ConnectionIndicator({ status }: ConnectionIndicatorProps) {
  const statusConfig = {
    connected: {
      color: "bg-success",
      text: "Connected",
      pulse: true,
    },
    disconnected: {
      color: "bg-destructive",
      text: "Disconnected",
      pulse: false,
    },
    reconnecting: {
      color: "bg-chart-5",
      text: "Reconnecting...",
      pulse: true,
    },
  }

  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
        {config.pulse && (
          <motion.div
            className={`absolute inset-0 h-2.5 w-2.5 rounded-full ${config.color}`}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [1, 0, 1],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />
        )}
      </div>
      <span className="text-sm font-medium text-muted-foreground">{config.text}</span>
    </div>
  )
}
