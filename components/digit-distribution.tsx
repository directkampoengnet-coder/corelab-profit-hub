"use client"

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts"

interface DigitFrequency {
  digit: number
  count: number
  percentage: number
}

interface DigitDistributionProps {
  frequencies: DigitFrequency[] | Record<number, number>
  currentDigit: number | null
  theme: string
}

export function DigitDistribution({ frequencies, currentDigit, theme }: DigitDistributionProps) {
  const data = Array.from({ length: 10 }, (_, i) => {
    // Safety check - if frequencies is undefined or null, return 0
    if (!frequencies) {
      return { digit: i, count: 0 }
    }

    // If frequencies is an array (DigitFrequency[])
    if (Array.isArray(frequencies)) {
      const found = frequencies.find((f) => f.digit === i)
      return { digit: i, count: found?.count || 0 }
    }

    // If frequencies is a Record<number, number>
    return { digit: i, count: frequencies[i] || 0 }
  })

  const maxCount = Math.max(...data.map((d) => d.count), 1)

  const getBarColor = (digit: number) => {
    if (digit === currentDigit) {
      return theme === "dark" ? "#22c55e" : "#16a34a"
    }
    return theme === "dark" ? "#3b82f6" : "#2563eb"
  }

  return (
    <div className="w-full h-[200px] sm:h-[250px] md:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <XAxis
            dataKey="digit"
            tick={{ fill: theme === "dark" ? "#94a3b8" : "#64748b", fontSize: 12 }}
            axisLine={{ stroke: theme === "dark" ? "#334155" : "#e2e8f0" }}
            tickLine={{ stroke: theme === "dark" ? "#334155" : "#e2e8f0" }}
          />
          <YAxis
            tick={{ fill: theme === "dark" ? "#94a3b8" : "#64748b", fontSize: 12 }}
            axisLine={{ stroke: theme === "dark" ? "#334155" : "#e2e8f0" }}
            tickLine={{ stroke: theme === "dark" ? "#334155" : "#e2e8f0" }}
            domain={[0, maxCount]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
              border: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`,
              borderRadius: "8px",
              color: theme === "dark" ? "#f1f5f9" : "#1e293b",
            }}
            labelFormatter={(label) => `Digit: ${label}`}
            formatter={(value: number) => [`Count: ${value}`, ""]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={`cell-${entry.digit}`} fill={getBarColor(entry.digit)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
