// Centralized Deriv market configuration
// Reference: https://developers.deriv.com/docs/market-data-apis
// All symbols are fetched dynamically using active_symbols API

export interface DerivMarket {
  symbol: string
  name: string
  pipSize: number
  category: "volatility_1s" | "volatility" | "jump" | "step" | "range_break" | "crash_boom"
  isOpen: boolean
}

// Contract types from Deriv API
// Reference: https://developers.deriv.com/docs/trading-apis
export const DERIV_CONTRACT_TYPES = {
  // Digit Contracts
  DIGITDIFF: "DIGITDIFF", // Digit Differs
  DIGITMATCH: "DIGITMATCH", // Digit Matches
  DIGITOVER: "DIGITOVER", // Digit Over
  DIGITUNDER: "DIGITUNDER", // Digit Under
  DIGITODD: "DIGITODD", // Digit Odd
  DIGITEVEN: "DIGITEVEN", // Digit Even

  // Up/Down Contracts
  CALL: "CALL", // Rise/Higher
  PUT: "PUT", // Fall/Lower

  // Touch/No Touch
  ONETOUCH: "ONETOUCH",
  NOTOUCH: "NOTOUCH",

  // In/Out
  EXPIRYRANGE: "EXPIRYRANGE",
  EXPIRYMISS: "EXPIRYMISS",
  RANGE: "RANGE",
  UPORDOWN: "UPORDOWN",
} as const

// Duration units from Deriv API
export const DERIV_DURATION_UNITS = {
  TICKS: "t",
  SECONDS: "s",
  MINUTES: "m",
  HOURS: "h",
  DAYS: "d",
} as const

// Basis types for proposals
export const DERIV_BASIS_TYPES = {
  STAKE: "stake",
  PAYOUT: "payout",
} as const

// Reference: https://synthetics.info/volatility-indices-lot-size-guide/
// Reference: https://developers.deriv.com/docs/market-data-apis
// Pip sizes from Deriv API active_symbols response:
// V10, V15, V25, V100, V150, V200, V250 = 2 decimal places (pip: 0.01)
// V30, V50, V75, V90 = 4 decimal places (pip: 0.0001)
export const DERIV_SYNTHETIC_MARKETS: DerivMarket[] = [
  // Volatility Indices (1s) - Tick every second
  { symbol: "1HZ10V", name: "Volatility 10 (1s)", pipSize: 0.01, category: "volatility_1s", isOpen: true },
  { symbol: "1HZ15V", name: "Volatility 15 (1s)", pipSize: 0.01, category: "volatility_1s", isOpen: true },
  { symbol: "1HZ25V", name: "Volatility 25 (1s)", pipSize: 0.01, category: "volatility_1s", isOpen: true },
  { symbol: "1HZ30V", name: "Volatility 30 (1s)", pipSize: 0.0001, category: "volatility_1s", isOpen: true },
  { symbol: "1HZ50V", name: "Volatility 50 (1s)", pipSize: 0.0001, category: "volatility_1s", isOpen: true },
  { symbol: "1HZ75V", name: "Volatility 75 (1s)", pipSize: 0.0001, category: "volatility_1s", isOpen: true },
  { symbol: "1HZ90V", name: "Volatility 90 (1s)", pipSize: 0.0001, category: "volatility_1s", isOpen: true },
  { symbol: "1HZ100V", name: "Volatility 100 (1s)", pipSize: 0.01, category: "volatility_1s", isOpen: true },
  { symbol: "1HZ150V", name: "Volatility 150 (1s)", pipSize: 0.01, category: "volatility_1s", isOpen: true },
  { symbol: "1HZ200V", name: "Volatility 200 (1s)", pipSize: 0.01, category: "volatility_1s", isOpen: true },
  { symbol: "1HZ250V", name: "Volatility 250 (1s)", pipSize: 0.01, category: "volatility_1s", isOpen: true },

  // Standard Volatility Indices - Tick every 2 seconds
  { symbol: "R_10", name: "Volatility 10 Index", pipSize: 0.01, category: "volatility", isOpen: true },
  { symbol: "R_25", name: "Volatility 25 Index", pipSize: 0.01, category: "volatility", isOpen: true },
  { symbol: "R_50", name: "Volatility 50 Index", pipSize: 0.0001, category: "volatility", isOpen: true },
  { symbol: "R_75", name: "Volatility 75 Index", pipSize: 0.0001, category: "volatility", isOpen: true },
  { symbol: "R_100", name: "Volatility 100 Index", pipSize: 0.01, category: "volatility", isOpen: true },

  // Jump Indices
  { symbol: "JD10", name: "Jump 10 Index", pipSize: 0.01, category: "jump", isOpen: true },
  { symbol: "JD25", name: "Jump 25 Index", pipSize: 0.01, category: "jump", isOpen: true },
  { symbol: "JD50", name: "Jump 50 Index", pipSize: 0.01, category: "jump", isOpen: true },
  { symbol: "JD75", name: "Jump 75 Index", pipSize: 0.01, category: "jump", isOpen: true },
  { symbol: "JD100", name: "Jump 100 Index", pipSize: 0.01, category: "jump", isOpen: true },

  // Step Index
  { symbol: "stpRNG", name: "Step Index", pipSize: 0.01, category: "step", isOpen: true },

  // Crash/Boom Indices
  { symbol: "BOOM300N", name: "Boom 300 Index", pipSize: 0.01, category: "crash_boom", isOpen: true },
  { symbol: "BOOM500", name: "Boom 500 Index", pipSize: 0.01, category: "crash_boom", isOpen: true },
  { symbol: "BOOM1000", name: "Boom 1000 Index", pipSize: 0.01, category: "crash_boom", isOpen: true },
  { symbol: "CRASH300N", name: "Crash 300 Index", pipSize: 0.01, category: "crash_boom", isOpen: true },
  { symbol: "CRASH500", name: "Crash 500 Index", pipSize: 0.01, category: "crash_boom", isOpen: true },
  { symbol: "CRASH1000", name: "Crash 1000 Index", pipSize: 0.01, category: "crash_boom", isOpen: true },
]

// Markets that support digit contracts
export const DIGIT_CONTRACT_MARKETS = DERIV_SYNTHETIC_MARKETS.filter(
  (m) => m.category === "volatility_1s" || m.category === "volatility",
)

// Get market by symbol
export function getMarketBySymbol(symbol: string): DerivMarket | undefined {
  return DERIV_SYNTHETIC_MARKETS.find((m) => m.symbol === symbol)
}

// Get pip size for a symbol (defaults to 0.01 if not found)
export function getPipSize(symbol: string): number {
  const market = getMarketBySymbol(symbol)
  return market?.pipSize || 0.01
}

export function extractLastDigit(price: number, symbol: string): number {
  if (!Number.isFinite(price) || price <= 0) {
    return 0
  }

  const pipSize = getPipSize(symbol)

  // Get decimal places from pip size (0.01 = 2, 0.0001 = 4)
  const decimalPlaces = Math.round(-Math.log10(pipSize))

  // Convert to string with exact decimal places to avoid floating point issues
  // This is the same method used in the header digit extraction
  const priceStr = price.toFixed(decimalPlaces)

  // Get the last character which is the last significant digit
  const lastChar = priceStr.charAt(priceStr.length - 1)
  const digit = Number.parseInt(lastChar, 10)

  return isNaN(digit) ? 0 : digit
}

// Get markets by category
export function getMarketsByCategory(category: DerivMarket["category"]): DerivMarket[] {
  return DERIV_SYNTHETIC_MARKETS.filter((m) => m.category === category)
}

// Get all market symbols as array
export function getAllMarketSymbols(): string[] {
  return DERIV_SYNTHETIC_MARKETS.map((m) => m.symbol)
}

// Validate if a contract type requires a barrier (digit prediction)
export function requiresBarrier(contractType: string): boolean {
  return ["DIGITMATCH", "DIGITDIFF", "DIGITOVER", "DIGITUNDER"].includes(contractType)
}

// Get valid duration range for contract type
export function getDurationRange(contractType: string): { min: number; max: number; unit: string } {
  if (contractType.startsWith("DIGIT")) {
    return { min: 1, max: 10, unit: "t" } // 1-10 ticks for digit contracts
  }
  return { min: 1, max: 365, unit: "d" } // Default
}

// Recommended markets for digit trading (most liquid)
export const RECOMMENDED_DIGIT_MARKETS = DIGIT_CONTRACT_MARKETS.map((m) => m.symbol)

// For backward compatibility
export const DERIV_MARKETS = DERIV_SYNTHETIC_MARKETS
