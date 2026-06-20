"use client"

import { motion } from "framer-motion"
import type { Signal } from "@/lib/analysis-engine"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface SignalCardProps {
  signal: Signal
}

export function SignalCard({ signal }: SignalCardProps) {
  const statusConfig = {
    "TRADE NOW": {
      color: "bg-success text-success-foreground",
      glow: "shadow-[0_0_20px_rgba(34,197,94,0.5)]",
    },
    WAIT: {
      color: "bg-chart-5 text-foreground",
      glow: "shadow-[0_0_15px_rgba(251,191,36,0.3)]",
    },
    NEUTRAL: {
      color: "bg-muted text-muted-foreground",
      glow: "",
    },
  }

  const config = statusConfig[signal.status]
  const shouldPulse = signal.status === "TRADE NOW"

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={shouldPulse ? "animate-pulse-slow" : ""}
    >
      <Card className={`neomorph ${config.glow}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg capitalize">{signal.type.replace("_", " / ")}</CardTitle>
            <Badge className={config.color}>{signal.status}</Badge>
          </div>
          <CardDescription>{signal.probability.toFixed(1)}% Probability</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">Recommendation</div>
            <div className="text-sm text-foreground">{signal.recommendation}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">Entry Condition</div>
            <div className="text-sm text-foreground">{signal.entryCondition}</div>
          </div>
          {signal.targetDigit !== undefined && (
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Target Digit</div>
              <div className="text-2xl font-bold text-primary">{signal.targetDigit}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
