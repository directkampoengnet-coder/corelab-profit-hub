// Risk management and martingale logic
import { getConfig } from "./config"

export interface RiskState {
  balance: number
  totalStake: number
  totalProfit: number
  openTrades: number
  consecutiveLosses: number
  martingaleLevel: number
}

export class RiskManager {
  private state: RiskState = {
    balance: 0,
    totalStake: 0,
    totalProfit: 0,
    openTrades: 0,
    consecutiveLosses: 0,
    martingaleLevel: 0,
  }

  updateBalance(balance: number): void {
    this.state.balance = balance
  }

  canOpenTrade(): boolean {
    const config = getConfig()

    // Check max open trades
    if (this.state.openTrades >= 1) {
      return false
    }

    // Check stop loss
    if (this.state.totalProfit < -config.STOP_LOSS_USD) {
      return false
    }

    // Check take profit
    if (this.state.totalProfit >= config.TAKE_PROFIT_USD) {
      return false
    }

    // Check balance
    if (this.state.balance <= 0) {
      return false
    }

    return true
  }

  getStakeForAttempt(attemptIndex: number): number {
    const config = getConfig()
    const multipliers = config.MARTINGALE_MULTIPLIERS.split(",").map((m) => Number.parseInt(m.trim()))
    const baseStake = config.BASE_STAKE_USD

    if (attemptIndex >= multipliers.length) {
      return baseStake * multipliers[multipliers.length - 1]
    }

    return baseStake * multipliers[attemptIndex]
  }

  recordTrade(stake: number, profitLoss: number): void {
    this.state.totalStake += stake
    this.state.totalProfit += profitLoss
    this.state.openTrades--

    if (profitLoss < 0) {
      this.state.consecutiveLosses++
    } else {
      this.state.consecutiveLosses = 0
      this.state.martingaleLevel = 0
    }

    if (this.state.consecutiveLosses > 0) {
      this.state.martingaleLevel = Math.min(this.state.consecutiveLosses - 1, getConfig().MAX_MARTINGALE_ATTEMPTS - 1)
    }
  }

  openTrade(): void {
    this.state.openTrades++
  }

  getState(): RiskState {
    return { ...this.state }
  }

  reset(): void {
    this.state = {
      balance: this.state.balance,
      totalStake: 0,
      totalProfit: 0,
      openTrades: 0,
      consecutiveLosses: 0,
      martingaleLevel: 0,
    }
  }
}
