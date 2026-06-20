"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface EvenOddPieChartProps {
  evenCount: number
  oddCount: number
}

export function EvenOddPieChart({ evenCount, oddCount }: EvenOddPieChartProps) {
  const data = [
    { name: "Even", value: evenCount, color: "hsl(var(--primary))" },
    { name: "Odd", value: oddCount, color: "hsl(var(--accent))" },
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
