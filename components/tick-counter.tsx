"use client"

interface TickCounterProps {
  count: number
  maxTicks: number
}

export function TickCounter({ count, maxTicks }: TickCounterProps) {
  const percentage = (count / maxTicks) * 100

  return (
    <div className="neomorph rounded-xl p-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Tick Window</span>
          <span className="text-2xl font-bold text-foreground">{count}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground text-right">of {maxTicks} ticks</div>
      </div>
    </div>
  )
}
