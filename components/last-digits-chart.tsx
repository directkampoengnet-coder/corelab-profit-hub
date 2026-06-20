"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface LastDigitsChartProps {
  digits: number[]
  count?: number
  title?: string
  theme?: "light" | "dark"
}

const uniqueDigitColors = [
  "#a855f7", // purple
  "#3b82f6", // blue
  "#06b6d4", // cyan
  "#14b8a6", // teal
  "#10b981", // emerald
  "#84cc16", // lime
  "#f59e0b", // amber
  "#f97316", // orange
  "#ef4444", // red
  "#ec4899", // pink
]

export function LastDigitsChart({
  digits,
  count = 20,
  title = "Last 20 Digits",
  theme = "dark",
}: LastDigitsChartProps) {
  const displayDigits = digits.slice(-count)

  const data = displayDigits.map((digit, index) => ({
    index: index + 1,
    digit,
    fill: uniqueDigitColors[digit],
  }))

  return (
    <div
      className={`rounded-xl p-6 border ${
        theme === "dark"
          ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.2)]"
          : "bg-white border-gray-200 shadow-lg"
      }`}
    >
      <h3 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#374151" : "#e5e7eb"} />
          <XAxis
            dataKey="index"
            stroke={theme === "dark" ? "#9ca3af" : "#6b7280"}
            tick={{ fill: theme === "dark" ? "#9ca3af" : "#6b7280" }}
          />
          <YAxis
            domain={[0, 9]}
            stroke={theme === "dark" ? "#9ca3af" : "#6b7280"}
            tick={{ fill: theme === "dark" ? "#9ca3af" : "#6b7280" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: theme === "dark" ? "#1f2937" : "#ffffff",
              border: `1px solid ${theme === "dark" ? "#374151" : "#e5e7eb"}`,
              borderRadius: "8px",
              color: theme === "dark" ? "#ffffff" : "#000000",
            }}
          />
          <Bar dataKey="digit" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
