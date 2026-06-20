"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "lucide-react"

interface TradeConfigurationProps {
  theme: "light" | "dark"
  activeSymbols: any[]
  contractsCache: Record<string, any>
  selectedMarket: string
  selectedCategory: string
  selectedType: string
  onMarketChange: (market: string) => void
  onCategoryChange: (category: string) => void
  onTypeChange: (type: string) => void
  isLoading?: boolean
}

export function TradeConfiguration({
  theme,
  activeSymbols,
  contractsCache,
  selectedMarket,
  selectedCategory,
  selectedType,
  onMarketChange,
  onCategoryChange,
  onTypeChange,
  isLoading = false,
}: TradeConfigurationProps) {
  const [marketInfo, setMarketInfo] = useState<any>(null)

  // Get available categories for selected market
  const availableCategories = useMemo(() => {
    if (!contractsCache[selectedMarket]) return []
    return Object.keys(contractsCache[selectedMarket])
  }, [contractsCache, selectedMarket])

  // Get available contract types for selected category
  const availableTypes = useMemo(() => {
    if (!contractsCache[selectedMarket] || !selectedCategory) return []
    return contractsCache[selectedMarket][selectedCategory] || []
  }, [contractsCache, selectedMarket, selectedCategory])

  // Update market info when market changes
  useEffect(() => {
    const market = activeSymbols.find((s) => s.symbol === selectedMarket)
    setMarketInfo(market)
  }, [selectedMarket, activeSymbols])

  // Auto-select first category if current one is not available
  useEffect(() => {
    if (availableCategories.length > 0 && !availableCategories.includes(selectedCategory)) {
      onCategoryChange(availableCategories[0])
    }
  }, [availableCategories, selectedCategory, onCategoryChange])

  // Auto-select first type if current one is not available
  useEffect(() => {
    if (availableTypes.length > 0) {
      const currentTypeExists = availableTypes.some((t: any) => t.contract_type === selectedType)
      if (!currentTypeExists) {
        onTypeChange(availableTypes[0].contract_type)
      }
    }
  }, [availableTypes, selectedType, onTypeChange])

  return (
    <Card
      className={
        theme === "dark"
          ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20"
          : "bg-white border-gray-200"
      }
    >
      <CardHeader>
        <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>Trade Configuration</CardTitle>
        <CardDescription className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
          Select market, trade type, and contract type for your trades
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Market Selection */}
        <div className="space-y-3">
          <Label className={`text-base font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Market
          </Label>
          <Select value={selectedMarket} onValueChange={onMarketChange} disabled={isLoading}>
            <SelectTrigger
              className={`w-full ${theme === "dark" ? "bg-[#0a0e27] border-blue-500/30 text-white" : "bg-white border-gray-300"}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className={theme === "dark" ? "bg-[#0a0e27] border-blue-500/30" : "bg-white border-gray-300"}
            >
              {activeSymbols.map((symbol) => (
                <SelectItem key={symbol.symbol} value={symbol.symbol}>
                  <div className="flex items-center gap-2">
                    <span>{symbol.display_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {symbol.market}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {marketInfo && (
            <div
              className={`text-sm p-2 rounded ${theme === "dark" ? "bg-blue-500/10 text-blue-300" : "bg-blue-50 text-blue-700"}`}
            >
              Market: {marketInfo.market_display_name}
            </div>
          )}
        </div>

        {/* Trade Type (Category) Selection */}
        <div className="space-y-3">
          <Label className={`text-base font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Trade Type
          </Label>
          {availableCategories.length === 0 ? (
            <div
              className={`flex items-center gap-2 p-3 rounded ${theme === "dark" ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}
            >
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">No trade types available for this market</span>
            </div>
          ) : (
            <Select value={selectedCategory} onValueChange={onCategoryChange} disabled={isLoading}>
              <SelectTrigger
                className={`w-full ${theme === "dark" ? "bg-[#0a0e27] border-blue-500/30 text-white" : "bg-white border-gray-300"}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                className={theme === "dark" ? "bg-[#0a0e27] border-blue-500/30" : "bg-white border-gray-300"}
              >
                {availableCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    <span className="capitalize">{category.replace(/_/g, " ")}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Contract Type Selection */}
        <div className="space-y-3">
          <Label className={`text-base font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Contract Type
          </Label>
          {availableTypes.length === 0 ? (
            <div
              className={`flex items-center gap-2 p-3 rounded ${theme === "dark" ? "bg-red-500/10 text-red-300" : "bg-red-50 text-red-700"}`}
            >
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">No contract types available for this trade type</span>
            </div>
          ) : (
            <Select value={selectedType} onValueChange={onTypeChange} disabled={isLoading}>
              <SelectTrigger
                className={`w-full ${theme === "dark" ? "bg-[#0a0e27] border-blue-500/30 text-white" : "bg-white border-gray-300"}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                className={theme === "dark" ? "bg-[#0a0e27] border-blue-500/30" : "bg-white border-gray-300"}
              >
                {availableTypes.map((type: any) => (
                  <SelectItem key={type.contract_type} value={type.contract_type}>
                    <div className="flex items-center gap-2">
                      <span>{type.contract_display}</span>
                      <Badge variant="outline" className="text-xs">
                        {type.contract_type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Configuration Summary */}
        {selectedMarket && selectedCategory && selectedType && (
          <div
            className={`p-4 rounded-lg border ${theme === "dark" ? "bg-green-500/10 border-green-500/30" : "bg-green-50 border-green-200"}`}
          >
            <h4 className={`font-semibold mb-2 ${theme === "dark" ? "text-green-300" : "text-green-700"}`}>
              Configuration Summary
            </h4>
            <div className={`space-y-1 text-sm ${theme === "dark" ? "text-green-200" : "text-green-600"}`}>
              <div>Market: {marketInfo?.display_name || selectedMarket}</div>
              <div>Trade Type: {selectedCategory}</div>
              <div>
                Contract:{" "}
                {availableTypes.find((t: any) => t.contract_type === selectedType)?.contract_display || selectedType}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
