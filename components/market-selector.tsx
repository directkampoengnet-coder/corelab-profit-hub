"use client"

import { useState, useMemo } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { DerivSymbol } from "@/lib/deriv-websocket"

interface MarketSelectorProps {
  symbols: DerivSymbol[]
  currentSymbol: string
  onSymbolChange: (symbol: string) => void
  theme?: "light" | "dark"
}

export function MarketSelector({ symbols, currentSymbol, onSymbolChange, theme = "dark" }: MarketSelectorProps) {
  const [open, setOpen] = useState(false)

  const groupedSymbols = useMemo(() => {
    const volatility1s: DerivSymbol[] = []
    const volatilityIndices: DerivSymbol[] = []
    const otherSymbols: DerivSymbol[] = []

    symbols.forEach((symbol) => {
      if (symbol.symbol.includes("1s")) {
        volatility1s.push(symbol)
      } else if (symbol.symbol.includes("R_") || symbol.market === "synthetic_index") {
        volatilityIndices.push(symbol)
      } else {
        otherSymbols.push(symbol)
      }
    })

    volatility1s.sort((a, b) => {
      const aNum = Number.parseInt(a.symbol.match(/\d+/)?.[0] || "0")
      const bNum = Number.parseInt(b.symbol.match(/\d+/)?.[0] || "0")
      return aNum - bNum
    })

    volatilityIndices.sort((a, b) => {
      const aNum = Number.parseInt(a.symbol.replace("R_", "").replace("1s", "")) || 0
      const bNum = Number.parseInt(b.symbol.replace("R_", "").replace("1s", "")) || 0
      return aNum - bNum
    })

    const groups: Record<string, DerivSymbol[]> = {}
    otherSymbols.forEach((symbol) => {
      const market = symbol.market_display_name || symbol.market
      if (!groups[market]) {
        groups[market] = []
      }
      groups[market].push(symbol)
    })

    const sortedGroups: Record<string, DerivSymbol[]> = {}

    if (volatility1s.length > 0) {
      sortedGroups["Volatility 1s"] = volatility1s
    }
    if (volatilityIndices.length > 0) {
      sortedGroups["Volatility Indices"] = volatilityIndices
    }

    Object.keys(groups)
      .sort()
      .forEach((market) => {
        sortedGroups[market] = groups[market]
      })

    return sortedGroups
  }, [symbols])

  const currentSymbolData = symbols.find((s) => s.symbol === currentSymbol)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-[220px] justify-between ${
            theme === "dark"
              ? "bg-[#0f1629]/50 border-blue-500/30 text-white hover:bg-[#1a2235] hover:text-white"
              : "bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
          }`}
        >
          {currentSymbolData?.display_name || currentSymbol}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={`w-[320px] p-0 max-h-[450px] overflow-y-auto ${
          theme === "dark" ? "bg-[#0a0e27] border-blue-500/30" : "bg-white border-gray-300"
        }`}
      >
        <Command className={theme === "dark" ? "bg-[#0a0e27]" : "bg-white"}>
          <CommandInput placeholder="Search markets..." className={theme === "dark" ? "text-white" : "text-gray-900"} />
          <CommandList>
            <CommandEmpty className={`py-6 text-center ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              No market found.
            </CommandEmpty>
            {Object.entries(groupedSymbols).map(([market, marketSymbols]) => (
              <CommandGroup
                key={market}
                heading={market}
                className={theme === "dark" ? "text-blue-400 font-semibold" : "text-blue-600 font-semibold"}
              >
                {marketSymbols.map((symbol) => (
                  <CommandItem
                    key={symbol.symbol}
                    value={symbol.symbol}
                    onSelect={() => {
                      onSymbolChange(symbol.symbol)
                      setOpen(false)
                    }}
                    className={
                      theme === "dark"
                        ? "text-white hover:bg-blue-500/20 cursor-pointer"
                        : "text-gray-900 hover:bg-blue-50 cursor-pointer"
                    }
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${
                        currentSymbol === symbol.symbol ? "opacity-100 text-green-400" : "opacity-0"
                      }`}
                    />
                    {symbol.display_name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
