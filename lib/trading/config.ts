// Trading system configuration - loads from environment variables
import { z } from "zod"

const configSchema = z.object({
  DERIV_APP_ID: z.string().default("106629"),
  DERIV_API_TOKEN: z.string(),
  WS_URL: z.string().default("wss://ws.derivws.com/websockets/v3"),
  EXECUTION_MODE: z.enum(["demo", "live"]).default("demo"),
  MARKETS: z.string().default("R_100,R_75,R_50,R_25,R_10"),
  BASE_STAKE_USD: z.coerce.number().default(1),
  MARTINGALE_MULTIPLIERS: z.string().default("1,2,4,8"),
  MAX_MARTINGALE_ATTEMPTS: z.coerce.number().default(3),
  STOP_LOSS_USD: z.coerce.number().default(50),
  TAKE_PROFIT_USD: z.coerce.number().default(100),
  AUTO_RESTART_DELAY_S: z.coerce.number().default(2),
  ULTRA_MAX_LATENCY_MS: z.coerce.number().default(80),
  TICK_HISTORY_SIZE: z.coerce.number().default(12),
  DIGIT_THRESHOLD: z.coerce.number().default(0.25),
})

type Config = z.infer<typeof configSchema>

let cachedConfig: Config | null = null

export function getConfig(): Config {
  if (cachedConfig) return cachedConfig

  const env = {
    DERIV_APP_ID: process.env.DERIV_APP_ID,
    DERIV_API_TOKEN: process.env.DERIV_API_TOKEN,
    WS_URL: process.env.WS_URL,
    EXECUTION_MODE: process.env.EXECUTION_MODE,
    MARKETS: process.env.MARKETS,
    BASE_STAKE_USD: process.env.BASE_STAKE_USD,
    MARTINGALE_MULTIPLIERS: process.env.MARTINGALE_MULTIPLIERS,
    MAX_MARTINGALE_ATTEMPTS: process.env.MAX_MARTINGALE_ATTEMPTS,
    STOP_LOSS_USD: process.env.STOP_LOSS_USD,
    TAKE_PROFIT_USD: process.env.TAKE_PROFIT_USD,
    AUTO_RESTART_DELAY_S: process.env.AUTO_RESTART_DELAY_S,
    ULTRA_MAX_LATENCY_MS: process.env.ULTRA_MAX_LATENCY_MS,
    TICK_HISTORY_SIZE: process.env.TICK_HISTORY_SIZE,
    DIGIT_THRESHOLD: process.env.DIGIT_THRESHOLD,
  }

  cachedConfig = configSchema.parse(env)
  return cachedConfig
}

export function getMarkets(): string[] {
  return getConfig()
    .MARKETS.split(",")
    .map((m) => m.trim())
}

export function getMartingaleMultipliers(): number[] {
  return getConfig()
    .MARTINGALE_MULTIPLIERS.split(",")
    .map((m) => Number.parseInt(m.trim()))
}
