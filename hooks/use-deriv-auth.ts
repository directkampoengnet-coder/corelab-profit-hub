"use client"

import { useEffect, useState } from "react"
import { DERIV_CONFIG } from "@/lib/deriv-config"

interface Balance {
  amount: number
  currency: string
}

interface Account {
  id: string
  type: "Demo" | "Real"
  currency: string
}

export function useDerivAuth() {
  const [token, setToken] = useState<string>("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [balance, setBalance] = useState<Balance | null>(null)
  const [accountType, setAccountType] = useState<"Demo" | "Real" | null>(null)
  const [accountCode, setAccountCode] = useState<string>("")
  const [accounts, setAccounts] = useState<Account[]>([])
  const [activeLoginId, setActiveLoginId] = useState<string | null>(null)
  const [wsRef, setWsRef] = useState<WebSocket | null>(null)
  const [balanceSubscribed, setBalanceSubscribed] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected")

  useEffect(() => {
    if (typeof window === "undefined") return

    const storedAccountType = localStorage.getItem("deriv_account_type") as "Demo" | "Real" | null
    const storedBalance = localStorage.getItem("deriv_balance")
    const storedAccountCode = localStorage.getItem("deriv_account_code")
    const storedActiveLoginId = localStorage.getItem("deriv_active_login_id")

    if (storedAccountType) setAccountType(storedAccountType)
    if (storedBalance) setBalance(JSON.parse(storedBalance))
    if (storedAccountCode) setAccountCode(storedAccountCode)
    if (storedActiveLoginId) setActiveLoginId(storedActiveLoginId)
  }, [])

  const loginWithDeriv = () => {
    if (typeof window === "undefined") return

    const redirectUri = encodeURIComponent(window.location.href.split("?")[0])
    const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_CONFIG.APP_ID}&redirect_uri=${redirectUri}`

    console.log("REDIRECT URI =", redirectUri)
console.log("OAUTH URL =", oauthUrl)
    
    console.log("[v0] 🔐 Initiating OAuth login...")
    window.location.href = oauthUrl
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    const urlParams = new URLSearchParams(window.location.search)
    let oauthToken = urlParams.get("token")

    if (!oauthToken) {
      for (let i = 1; i < 5; i++) {
        const tokenKey = `token${i}`
        if (urlParams.has(tokenKey)) {
          oauthToken = urlParams.get(tokenKey)
          break
        }
      }
    }

    const accountsFromUrl = []
    for (let i = 1; i < 5; i++) {
      const acctKey = `acct${i}`
      const tokenKey = `token${i}`
      const curKey = `cur${i}`
      if (urlParams.has(acctKey) && urlParams.has(tokenKey) && urlParams.has(curKey)) {
        accountsFromUrl.push({
          id: urlParams.get(acctKey),
          token: urlParams.get(tokenKey),
          currency: urlParams.get(curKey),
        })
      }
    }

    if (oauthToken) {
      console.log("[v0] ✅ OAuth token found in URL")
      localStorage.setItem("deriv_api_token", oauthToken)
      setToken(oauthToken)
      connectWithToken(oauthToken)

      if (accountsFromUrl.length > 0) {
        localStorage.setItem("deriv_accounts", JSON.stringify(accountsFromUrl))
      }

      window.history.replaceState({}, document.title, window.location.pathname)
      return
    }

    const storedToken = localStorage.getItem("deriv_api_token")

    if (storedToken && storedToken.length > 10) {
      console.log("[v0] ✅ Existing API token found")
      setToken(storedToken)
      connectWithToken(storedToken)
    } else {
      console.log("[v0] ℹ️ No API token found, initiating OAuth login")
      loginWithDeriv()
    }

    return () => {
      if (wsRef) {
        wsRef.close()
      }
    }
  }, [])

  const connectWithToken = (apiToken: string) => {
    if (!apiToken || apiToken.length < 10) {
      console.error("[v0] ❌ Invalid API token")
      setConnectionStatus("disconnected")
      return
    }

    if (wsRef) {
      console.log("[v0] Closing existing WebSocket connection")
      wsRef.close()
    }

    console.log("APP_ID =", DERIV_CONFIG.APP_ID)
    console.log("TOKEN LENGTH =", apiToken.length)

    setConnectionStatus("connecting")
    console.log("[v0] 🔌 Connecting to Deriv WebSocket with app_id:", DERIV_CONFIG.APP_ID)
    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${DERIV_CONFIG.APP_ID}`)

    ws.onopen = () => {
      console.log("[v0] ✅ WebSocket connected, sending authorization...")
      ws.send(JSON.stringify({ authorize: apiToken }))
    }

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data)

      if (data.error) {
        console.error("[v0] ❌ WebSocket error:", data.error.message)
        if (data.error.code === "InvalidToken") {
          console.log("[v0] ⚠️ Invalid token, clearing storage and re-initiating OAuth login")
          localStorage.removeItem("deriv_api_token")
          setConnectionStatus("disconnected")
          loginWithDeriv()
        }
        return
      }

      if (data.msg_type === "authorize" && data.authorize) {
        const { authorize } = data
        const accType = authorize.is_virtual ? "Demo" : "Real"
        const accCode = authorize.loginid || ""

        console.log("[v0] ✅ OAuth Authorization Complete!")
        console.log("[v0] 👤 Account:", authorize.loginid, `(${accType})`)
        console.log("[v0] 💰 Balance:", authorize.balance, authorize.currency)

        setConnectionStatus("connected")
        setAccountType(accType)
        setActiveLoginId(authorize.loginid)
        setAccountCode(accCode)
        setIsLoggedIn(true)

        localStorage.setItem("deriv_account_type", accType)
        localStorage.setItem("deriv_account_code", accCode)
        localStorage.setItem("deriv_active_login_id", authorize.loginid)

        const allAccounts = []
        const storedAccounts = JSON.parse(localStorage.getItem("deriv_accounts") || "[]")

        if (authorize.account_list && Array.isArray(authorize.account_list)) {
          console.log("[v0] 📋 Found", authorize.account_list.length, "linked accounts")
          const formatted = authorize.account_list.map((acc: any) => ({
            id: acc.loginid,
            type: acc.is_virtual ? "Demo" : "Real",
            currency: acc.currency,
          }))
          allAccounts.push(...formatted)
        }

        if (storedAccounts.length > 0) {
          storedAccounts.forEach((storedAcc) => {
            if (!allAccounts.find((acc) => acc.id === storedAcc.id)) {
              allAccounts.push({
                id: storedAcc.id,
                type: storedAcc.id.includes("VR") ? "Demo" : "Real",
                currency: storedAcc.currency,
              })
            }
          })
        }

        setAccounts(allAccounts)

        if (!balanceSubscribed) {
          ws.send(JSON.stringify({ forget_all: ["balance"] }))
          setTimeout(() => {
            ws.send(JSON.stringify({ balance: 1, subscribe: 1 }))
            setBalanceSubscribed(true)
            console.log("[v0] ✅ Balance subscription started")
          }, 100)
        }
      }

      if (data.msg_type === "balance" && data.balance) {
        console.log("[v0] 💰 Balance update:", data.balance.balance, data.balance.currency)
        const balanceData = {
          amount: data.balance.balance,
          currency: data.balance.currency,
        }
        setBalance(balanceData)
        localStorage.setItem("deriv_balance", JSON.stringify(balanceData))
      }
    }

    ws.onclose = () => {
      console.log("[v0] 🔌 WebSocket disconnected")
      setConnectionStatus("disconnected")
      setBalanceSubscribed(false)
    }

    ws.onerror = (error) => {
      console.error("[v0] ❌ WebSocket error:", error)
      setConnectionStatus("disconnected")
    }

    setWsRef(ws)
  }

  const logout = () => {
    if (typeof window === "undefined") return

    console.log("[v0] 👋 Logging out...")
    if (wsRef) {
      wsRef.send(JSON.stringify({ forget_all: ["balance", "ticks", "proposal_open_contract"] }))
      wsRef.close()
    }
    localStorage.removeItem("deriv_api_token")
    localStorage.removeItem("deriv_token")
    localStorage.removeItem("deriv_account")
    localStorage.removeItem("deriv_accounts")
    localStorage.removeItem("deriv_account_type")
    localStorage.removeItem("deriv_balance")
    localStorage.removeItem("deriv_account_code")
    localStorage.removeItem("deriv_active_login_id")

    setToken("")
    setIsLoggedIn(false)
    setBalance(null)
    setAccountType(null)
    setAccountCode("")
    setAccounts([])
    setActiveLoginId(null)
    setBalanceSubscribed(false)
    setConnectionStatus("disconnected")
    console.log("[v0] ✅ Logged out successfully")
    loginWithDeriv()
  }

  const switchAccount = (loginId: string) => {
    if (typeof window === "undefined") return

    console.log("[v0] 🔄 Switching to account:", loginId)

    const storedAccounts = JSON.parse(localStorage.getItem("deriv_accounts") || "[]")
    const accountInfo = storedAccounts.find((acc) => acc.id === loginId)
    const apiToken = accountInfo ? accountInfo.token : localStorage.getItem("deriv_api_token")

    if (!apiToken) {
      console.error(`[v0] ❌ No token found for account ${loginId}`)
      logout()
      return
    }

    localStorage.setItem("deriv_api_token", apiToken)
    setToken(apiToken)

    connectWithToken(apiToken)
  }

  return {
    token,
    isLoggedIn,
    isAuthenticated: isLoggedIn,
    loginWithDeriv,
    logout,
    balance,
    accountType,
    accountCode,
    accounts,
    switchAccount,
    activeLoginId,
    connectionStatus,
  }
}
