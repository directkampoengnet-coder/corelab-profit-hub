"use client"

import { motion } from "framer-motion"

interface StreakDisplayProps {
  streaks: { digit: number; count: number }[]
}

export function StreakDisplay({ streaks }: StreakDisplayProps) {
  if (streaks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No significant streaks detected (minimum 2 consecutive digits)
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {streaks.map((streak, index) => (
        <motion.div
          key={`${streak.digit}-${index}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          className="neomorph-inset rounded-xl p-4 text-center"
        >
          <div className="text-4xl font-bold text-primary mb-2">{streak.digit}</div>
          <div className="text-sm text-muted-foreground">{streak.count}x streak</div>
        </motion.div>
      ))}
    </div>
  )
}
