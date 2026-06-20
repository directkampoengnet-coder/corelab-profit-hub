const API_TOKEN_KEY = "deriv-api-token"
const API_TOKEN_EXPIRY_KEY = "deriv-api-token-expiry"

export const apiTokenManager = {
  // Save API token to localStorage
  saveToken: (token: string, expiryHours = 24) => {
    if (!token) return false
    localStorage.setItem(API_TOKEN_KEY, token)
    const expiry = new Date()
    expiry.setHours(expiry.getHours() + expiryHours)
    localStorage.setItem(API_TOKEN_EXPIRY_KEY, expiry.toISOString())
    console.log("[v0] API Token saved successfully")
    return true
  },

  // Get saved API token
  getToken: () => {
    const token = localStorage.getItem(API_TOKEN_KEY)
    const expiry = localStorage.getItem(API_TOKEN_EXPIRY_KEY)

    if (!token || !expiry) return null

    // Check if token is expired
    if (new Date(expiry) < new Date()) {
      apiTokenManager.clearToken()
      console.log("[v0] API Token expired")
      return null
    }

    return token
  },

  // Clear stored API token
  clearToken: () => {
    localStorage.removeItem(API_TOKEN_KEY)
    localStorage.removeItem(API_TOKEN_EXPIRY_KEY)
    console.log("[v0] API Token cleared")
  },

  // Check if token exists and is valid
  hasValidToken: () => {
    return apiTokenManager.getToken() !== null
  },
}
