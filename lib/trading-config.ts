export const TRADING_CONTRACTS = {
  DIGITOVER: "DIGITOVER",
  DIGITUNDER: "DIGITUNDER",
  DIGITEVEN: "DIGITEVEN",
  DIGITODD: "DIGITODD",
  DIGITDIFF: "DIGITDIFF",
  DIGITDMATCH: "DIGITDMATCH",
  CALL: "CALL",
  PUT: "PUT",
} as const

export const MARTINGALE_MULTIPLIERS = {
  OVER3_UNDER6: 2.6,
  OVER2_UNDER7: 3.5,
  EVEN_ODD: 2.1,
  RISE_FALL: 2.0,
  DIFFERS: 12.0,
  DEFAULT: 1.5,
} as const

export const PAYOUT_CONFIGURATIONS = {
  VOLATILITY_10: { min: 1, max: 10000, default: 1 },
  VOLATILITY_25: { min: 1, max: 10000, default: 1 },
  VOLATILITY_50: { min: 1, max: 10000, default: 1 },
  VOLATILITY_75: { min: 1, max: 10000, default: 1 },
  VOLATILITY_100: { min: 1, max: 10000, default: 1 },
  VOLATILITY_150: { min: 1, max: 10000, default: 1 },
  VOLATILITY_250: { min: 1, max: 10000, default: 1 },
} as const

export const TRADING_STRATEGIES = {
  OVER3_UNDER6: {
    name: "Over 3 / Under 6",
    contractOverType: TRADING_CONTRACTS.DIGITOVER,
    contractUnderType: TRADING_CONTRACTS.DIGITUNDER,
    martingale: MARTINGALE_MULTIPLIERS["OVER3_UNDER6"],
    entryCondition: "Highest digit analysis",
  },
  OVER2_UNDER7: {
    name: "Over 2 / Under 7",
    contractOverType: TRADING_CONTRACTS.DIGITOVER,
    contractUnderType: TRADING_CONTRACTS.DIGITUNDER,
    martingale: MARTINGALE_MULTIPLIERS["OVER2_UNDER7"],
    entryCondition: "Digit distribution analysis",
  },
  EVEN_ODD: {
    name: "Even / Odd",
    contractEvenType: TRADING_CONTRACTS.DIGITEVEN,
    contractOddType: TRADING_CONTRACTS.DIGITODD,
    martingale: MARTINGALE_MULTIPLIERS["EVEN_ODD"],
    entryCondition: "Consecutive opposite digits",
  },
  RISE_FALL: {
    name: "Rise / Fall",
    contractRiseType: TRADING_CONTRACTS.CALL,
    contractFallType: TRADING_CONTRACTS.PUT,
    martingale: MARTINGALE_MULTIPLIERS["RISE_FALL"],
    entryCondition: "Tick reversal detection",
  },
  DIFFERS: {
    name: "Differs (No Matches)",
    contractType: TRADING_CONTRACTS.DIGITDIFF,
    martingale: MARTINGALE_MULTIPLIERS["DIFFERS"],
    entryCondition: "Rarest digit detection",
  },
} as const

export const TICK_INTERVALS = {
  "1HZ10V": 1,
  "1HZ15V": 1,
  "1HZ25V": 1,
  "1HZ30V": 1,
  "1HZ50V": 1,
  "1HZ75V": 1,
  "1HZ90V": 1,
  "1HZ100V": 1,
  R_10: 2,
  R_25: 2,
  R_50: 2,
  R_75: 2,
  R_100: 2,
  R_150: 2,
  R_250: 2,
} as const

export type ContractType = (typeof TRADING_CONTRACTS)[keyof typeof TRADING_CONTRACTS]
export type StrategyKey = keyof typeof TRADING_STRATEGIES
export type MarketSymbol = keyof typeof TICK_INTERVALS
