// JSON logging with token masking
import fs from "fs"
import path from "path"

interface LogEntry {
  timestamp: string
  level: "info" | "warn" | "error" | "debug"
  message: string
  data?: any
}

let logFilePath: string | null = null

export function initializeLogger(logPath: string): void {
  const dir = path.dirname(logPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  logFilePath = logPath
}

function maskToken(obj: any): any {
  if (typeof obj !== "object" || obj === null) {
    return obj
  }

  const masked = { ...obj }

  if (masked.authorize) {
    masked.authorize = "***MASKED***"
  }
  if (masked.token) {
    masked.token = "***MASKED***"
  }
  if (masked.DERIV_API_TOKEN) {
    masked.DERIV_API_TOKEN = "***MASKED***"
  }

  return masked
}

export function log(level: "info" | "warn" | "error" | "debug", message: string, data?: any): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data: data ? maskToken(data) : undefined,
  }

  const logLine = JSON.stringify(entry)

  // Console output
  console.log(logLine)

  // File output
  if (logFilePath) {
    try {
      fs.appendFileSync(logFilePath, logLine + "\n")
    } catch (error) {
      console.error("Failed to write to log file:", error)
    }
  }
}

export function logInfo(message: string, data?: any): void {
  log("info", message, data)
}

export function logWarn(message: string, data?: any): void {
  log("warn", message, data)
}

export function logError(message: string, data?: any): void {
  log("error", message, data)
}

export function logDebug(message: string, data?: any): void {
  log("debug", message, data)
}

export function getTailLogs(lines = 50): string[] {
  if (!logFilePath || !fs.existsSync(logFilePath)) {
    return []
  }

  try {
    const content = fs.readFileSync(logFilePath, "utf-8")
    return content
      .split("\n")
      .filter((line) => line.trim())
      .slice(-lines)
  } catch (error) {
    console.error("Failed to read log file:", error)
    return []
  }
}
