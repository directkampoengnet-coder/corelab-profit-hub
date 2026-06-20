"use client"

import { motion } from "framer-motion"
import type { PredictionResult } from "@/lib/ai-predictor"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Brain } from "lucide-react"

interface AIPredictionPanelProps {
  prediction: PredictionResult | null
}

export function AIPredictionPanel({ prediction }: AIPredictionPanelProps) {
  if (!prediction) {
    return (
      <Card className="neomorph">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Predictions
          </CardTitle>
          <CardDescription>Waiting for sufficient data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Collecting tick data for AI analysis...</div>
        </CardContent>
      </Card>
    )
  }

  const chartData = prediction.predictions.map((p) => ({
    digit: p.digit.toString(),
    probability: p.probability,
    isTop: p.digit === prediction.topPrediction.digit,
    isSecond: p.digit === prediction.secondPrediction.digit,
  }))

  const getBarColor = (entry: any) => {
    if (entry.isTop) return "hsl(var(--success))"
    if (entry.isSecond) return "hsl(var(--accent))"
    return "hsl(var(--muted))"
  }

  return (
    <Card className="neomorph">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          AI Predictions
        </CardTitle>
        <CardDescription>Statistical pattern analysis & probability distribution</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top Predictions */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="neomorph-inset rounded-xl p-6 text-center"
          >
            <div className="text-sm text-muted-foreground mb-2">Top Prediction</div>
            <div className="text-5xl font-bold text-success mb-2">{prediction.topPrediction.digit}</div>
            <div className="text-lg font-semibold text-foreground">
              {prediction.topPrediction.confidence.toFixed(1)}%
            </div>
          </motion.div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="neomorph-inset rounded-xl p-6 text-center"
          >
            <div className="text-sm text-muted-foreground mb-2">Second Best</div>
            <div className="text-5xl font-bold text-accent mb-2">{prediction.secondPrediction.digit}</div>
            <div className="text-lg font-semibold text-foreground">
              {prediction.secondPrediction.confidence.toFixed(1)}%
            </div>
          </motion.div>
        </div>

        {/* Explanation */}
        <div className="glass rounded-xl p-4">
          <div className="text-sm font-medium text-muted-foreground mb-2">Analysis</div>
          <p className="text-sm text-foreground leading-relaxed">{prediction.explanation}</p>
        </div>

        {/* Probability Distribution Chart */}
        <div>
          <div className="text-sm font-medium text-muted-foreground mb-3">Probability Distribution</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="digit" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: any) => [`${value.toFixed(2)}%`, "Probability"]}
              />
              <Bar dataKey="probability" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-success" />
            <span>Top Prediction</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-accent" />
            <span>Second Best</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-muted" />
            <span>Other Digits</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
