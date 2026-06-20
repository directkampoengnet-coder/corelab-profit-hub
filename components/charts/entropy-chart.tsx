"use client"

interface EntropyChartProps {
  entropy: number
  maxEntropy?: number
}

export function EntropyChart({ entropy, maxEntropy = 3.32 }: EntropyChartProps) {
  // Create a simple visualization of current entropy vs max
  const data = [
    { name: "Min", value: 0 },
    { name: "Current", value: entropy },
    { name: "Max", value: maxEntropy },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Entropy (Randomness)</div>
          <div className="text-3xl font-bold text-foreground">{entropy.toFixed(3)}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Randomness Level</div>
          <div className="text-lg font-semibold text-primary">{((entropy / maxEntropy) * 100).toFixed(1)}%</div>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-destructive via-chart-5 to-success transition-all duration-500"
          style={{ width: `${(entropy / maxEntropy) * 100}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        Higher entropy indicates more random distribution. Max entropy for 10 digits is {maxEntropy.toFixed(2)}.
      </div>
    </div>
  )
}
