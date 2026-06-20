// SQLite database schema and persistence layer
// import Database from "better-sqlite3"
import path from "path"
import fs from "fs"

export interface Trade {
  id?: number
  loginId: string
  market: string
  contractType: string
  stake: number
  entryPrice: number
  entryTime: number
  exitPrice?: number
  exitTime?: number
  profitLoss?: number
  status: "open" | "closed" | "failed"
  martingaleLevel: number
  notes?: string
}

export interface Aggregate {
  sessionName: string
  startTime: number
  endTime?: number
  totalStake: number
  totalRuns: number
  totalWins: number
  totalLosses: number
  totalProfitLoss: number
  lastUpdated: number
}

let dbInstance: Database.Database | null = null

export function initializeDatabase(dbPath: string): Database.Database {
  // Create directory if it doesn't exist
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const db = new Database(dbPath)
  db.pragma("journal_mode = WAL")

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loginId TEXT NOT NULL,
      market TEXT NOT NULL,
      contractType TEXT NOT NULL,
      stake REAL NOT NULL,
      entryPrice REAL NOT NULL,
      entryTime INTEGER NOT NULL,
      exitPrice REAL,
      exitTime INTEGER,
      profitLoss REAL,
      status TEXT NOT NULL,
      martingaleLevel INTEGER DEFAULT 0,
      notes TEXT,
      createdAt INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS aggregates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionName TEXT NOT NULL UNIQUE,
      startTime INTEGER NOT NULL,
      endTime INTEGER,
      totalStake REAL DEFAULT 0,
      totalRuns INTEGER DEFAULT 0,
      totalWins INTEGER DEFAULT 0,
      totalLosses INTEGER DEFAULT 0,
      totalProfitLoss REAL DEFAULT 0,
      lastUpdated INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_trades_loginId ON trades(loginId);
    CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market);
    CREATE INDEX IF NOT EXISTS idx_trades_createdAt ON trades(createdAt);
  `)

  dbInstance = db
  return db
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    throw new Error("Database not initialized")
  }
  return dbInstance
}

export function addTrade(trade: Trade): number {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO trades (
      loginId, market, contractType, stake, entryPrice, entryTime,
      exitPrice, exitTime, profitLoss, status, martingaleLevel, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = stmt.run(
    trade.loginId,
    trade.market,
    trade.contractType,
    trade.stake,
    trade.entryPrice,
    trade.entryTime,
    trade.exitPrice || null,
    trade.exitTime || null,
    trade.profitLoss || null,
    trade.status,
    trade.martingaleLevel,
    trade.notes || null,
  )

  return result.lastInsertRowid as number
}

export function updateTrade(id: number, updates: Partial<Trade>): void {
  const db = getDatabase()

  const fields: string[] = []
  const values: any[] = []

  if (updates.exitPrice !== undefined) {
    fields.push("exitPrice = ?")
    values.push(updates.exitPrice)
  }
  if (updates.exitTime !== undefined) {
    fields.push("exitTime = ?")
    values.push(updates.exitTime)
  }
  if (updates.profitLoss !== undefined) {
    fields.push("profitLoss = ?")
    values.push(updates.profitLoss)
  }
  if (updates.status !== undefined) {
    fields.push("status = ?")
    values.push(updates.status)
  }
  if (updates.notes !== undefined) {
    fields.push("notes = ?")
    values.push(updates.notes)
  }

  if (fields.length === 0) return

  values.push(id)
  const stmt = db.prepare(`UPDATE trades SET ${fields.join(", ")} WHERE id = ?`)
  stmt.run(...values)
}

export function getTrades(limit = 100, offset = 0): Trade[] {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT * FROM trades
    ORDER BY createdAt DESC
    LIMIT ? OFFSET ?
  `)

  return stmt.all(limit, offset) as Trade[]
}

export function getTradesByMarket(market: string, limit = 100): Trade[] {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT * FROM trades
    WHERE market = ?
    ORDER BY createdAt DESC
    LIMIT ?
  `)

  return stmt.all(market, limit) as Trade[]
}

export function createAggregate(sessionName: string): Aggregate {
  const db = getDatabase()
  const now = Math.floor(Date.now() / 1000)

  const stmt = db.prepare(`
    INSERT INTO aggregates (
      sessionName, startTime, lastUpdated
    ) VALUES (?, ?, ?)
  `)

  stmt.run(sessionName, now, now)

  return {
    sessionName,
    startTime: now,
    totalStake: 0,
    totalRuns: 0,
    totalWins: 0,
    totalLosses: 0,
    totalProfitLoss: 0,
    lastUpdated: now,
  }
}

export function updateAggregate(sessionName: string, updates: Partial<Aggregate>): void {
  const db = getDatabase()

  const fields: string[] = []
  const values: any[] = []

  if (updates.endTime !== undefined) {
    fields.push("endTime = ?")
    values.push(updates.endTime)
  }
  if (updates.totalStake !== undefined) {
    fields.push("totalStake = ?")
    values.push(updates.totalStake)
  }
  if (updates.totalRuns !== undefined) {
    fields.push("totalRuns = ?")
    values.push(updates.totalRuns)
  }
  if (updates.totalWins !== undefined) {
    fields.push("totalWins = ?")
    values.push(updates.totalWins)
  }
  if (updates.totalLosses !== undefined) {
    fields.push("totalLosses = ?")
    values.push(updates.totalLosses)
  }
  if (updates.totalProfitLoss !== undefined) {
    fields.push("totalProfitLoss = ?")
    values.push(updates.totalProfitLoss)
  }

  fields.push("lastUpdated = ?")
  values.push(Math.floor(Date.now() / 1000))

  values.push(sessionName)

  const stmt = db.prepare(`UPDATE aggregates SET ${fields.join(", ")} WHERE sessionName = ?`)
  stmt.run(...values)
}

export function getAggregate(sessionName: string): Aggregate | null {
  const db = getDatabase()
  const stmt = db.prepare("SELECT * FROM aggregates WHERE sessionName = ?")
  return (stmt.get(sessionName) as Aggregate) || null
}

export function getAllAggregates(): Aggregate[] {
  const db = getDatabase()
  const stmt = db.prepare("SELECT * FROM aggregates ORDER BY startTime DESC")
  return stmt.all() as Aggregate[]
}

export function getTradeStats(sessionName?: string): {
  totalTrades: number
  totalStake: number
  totalWins: number
  totalLosses: number
  totalProfitLoss: number
  winRate: number
} {
  const db = getDatabase()

  const query =
    "SELECT COUNT(*) as count, SUM(stake) as stake, SUM(CASE WHEN profitLoss > 0 THEN 1 ELSE 0 END) as wins, SUM(CASE WHEN profitLoss < 0 THEN 1 ELSE 0 END) as losses, SUM(profitLoss) as profitLoss FROM trades WHERE status = 'closed'"

  if (sessionName) {
    // This would require adding sessionName to trades table
    // For now, we'll just get all trades
  }

  const stmt = db.prepare(query)
  const result = stmt.get() as any

  return {
    totalTrades: result.count || 0,
    totalStake: result.stake || 0,
    totalWins: result.wins || 0,
    totalLosses: result.losses || 0,
    totalProfitLoss: result.profitLoss || 0,
    winRate: result.count > 0 ? ((result.wins || 0) / result.count) * 100 : 0,
  }
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
