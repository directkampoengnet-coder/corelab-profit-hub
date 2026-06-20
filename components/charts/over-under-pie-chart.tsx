"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface OverUnderPieChartProps {
  highCount: number
  lowCount: number
}

export function OverUnderPieChart({ highCount, lowCount }: OverUnderPieChartProps) {
  const data = [
    { name: "Over 4.5", value: highCount, color: "hsl(var(--success))" },
    { name: "Under 4.5", value: lowCount, color: "hsl(var(--chart-5))" },
  ]

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
