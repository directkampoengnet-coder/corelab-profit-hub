/**
 * Deriv API Configuration
 *
 * Official Deriv GitHub Repositories:
 * - Main Deriv App (DTrader, Cashier, Account, Bot Web UI): https://github.com/deriv-com/deriv-app
 * - SmartTrader Platform: https://github.com/deriv-com/deriv-smarttrader
 * - Deriv API (WebSocket): https://github.com/deriv-com/deriv-api
 * - Deriv Copy Trading: https://github.com/deriv-com/copy-trading
 * - DBot: https://github.com/deriv-com/deriv-bot
 * - Derivatives Base (optional): https://github.com/deriv-com/derivatives
 */

export const DERIV_APP_ID = 106629
export const DERIV_REDIRECT_URL = typeof window !== "undefined" ? window.location.origin : ""

export const DERIV_CONFIG = {
  APP_ID: DERIV_APP_ID,
  REDIRECT_URL: DERIV_REDIRECT_URL,
} as const

// Official Deriv Platform URLs
export const DERIV_PLATFORMS = {
  DTRADER: "https://app.deriv.com",
  DBOT: "https://app.deriv.com/bot",
  SMARTTRADER: "https://smarttrader.deriv.com",
  COPYTRADING: "https://app.deriv.com/copy-trading",
} as const

// Official Deriv API Endpoints
export const DERIV_API = {
  WEBSOCKET: "wss://ws.derivws.com/websockets/v3",
  OAUTH: "https://oauth.deriv.com/oauth2/authorize",
} as const

// Official GitHub Repositories
export const DERIV_REPOS = {
  MAIN_APP: {
    name: "deriv-app",
    url: "https://github.com/deriv-com/deriv-app",
    description: "Main Deriv web platform - includes DTrader, Cashier, and Account modules",
    branch: "master",
    integration: "For DTrader, Auth, and base styling (via iframe embedding and API auth)",
  },
  DBOT: {
    name: "deriv-bot",
    url: "https://github.com/deriv-com/deriv-bot",
    description: "Official DBot (block-based automation bot builder)",
    branch: "master",
    integration: "For the DBot tab - runs inside iframe using app ID for Deriv API connection",
  },
  SMARTTRADER: {
    name: "deriv-smarttrader",
    url: "https://github.com/deriv-com/deriv-smarttrader",
    description: "SmartTrader web trading interface",
    branch: "master",
    integration: "For the SmartTrader tab - embedded iframe + login passthrough",
  },
  COPYTRADING: {
    name: "copy-trading",
    url: "https://github.com/deriv-com/copy-trading",
    description: "Official Copy Trading UI",
    branch: "main",
    integration: "For the Copy Trading tab - iframe with API token sync",
  },
  API: {
    name: "deriv-api",
    url: "https://github.com/deriv-com/deriv-api",
    description: "Official Deriv WebSocket API SDK",
    branch: "master",
    integration: "For integrating trading and account features into custom apps",
  },
  DERIVATIVES: {
    name: "derivatives",
    url: "https://github.com/deriv-com/derivatives",
    description: "Deriv's open-source derivatives engine",
    branch: "master",
    integration: "Optional - Used for trade execution logic (if running backend trading logic)",
  },
} as const
