import { type NextRequest, NextResponse } from "next/server"

// This is a simple API route to provide market symbols
// The actual WebSocket connection happens on the client side
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get("action")

  if (action === "symbols") {
    // Return available Deriv markets
    const symbols = [
      { value: "R_100", label: "Volatility 100 Index", category: "volatility" },
      { value: "R_75", label: "Volatility 75 Index", category: "volatility" },
      { value: "R_50", label: "Volatility 50 Index", category: "volatility" },
      { value: "R_25", label: "Volatility 25 Index", category: "volatility" },
      { value: "R_10", label: "Volatility 10 Index", category: "volatility" },
      { value: "1HZ100V", label: "1HZ Volatility 100", category: "1hz" },
      { value: "1HZ75V", label: "1HZ Volatility 75", category: "1hz" },
      { value: "1HZ50V", label: "1HZ Volatility 50", category: "1hz" },
      { value: "frxEURUSD", label: "EUR/USD", category: "forex" },
      { value: "frxGBPUSD", label: "GBP/USD", category: "forex" },
      { value: "frxUSDJPY", label: "USD/JPY", category: "forex" },
      { value: "frxAUDUSD", label: "AUD/USD", category: "forex" },
      { value: "frxXAUUSD", label: "Gold/USD", category: "commodities" },
      { value: "frxXAGUSD", label: "Silver/USD", category: "commodities" },
    ]

    return NextResponse.json({ symbols })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
