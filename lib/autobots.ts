import type { DerivAPIClient } from "./deriv-api"

export interface AutoBotConfig {
  symbol: string
  historyCount: number
  duration: number
  durationUnit: string
  tpPercent: number // Take profit as % of balance
  slPercent: number // Stop loss as % of balance
  useMartingale: boolean
  martingaleMultiplier: number
  cooldownMs: number
  maxTradesPerMinute: number
  initialStake: number
  balance: number
}

export interface AutoBotState {
  isRunning: boolean
  totalRuns: number
  wins: number
  losses: number
  profitLoss: number
  profitLossPercent: number
  currentStake: number
  consecutiveLosses: number
  trades: TradeLog[]
}

export interface TradeLog {
  id: string
  timestamp: number
  contract: string
  prediction: string
  result: "WIN" | "LOSS"
  profitLoss: number
  stake: number
}

export type BotStrategy =
  | "EVEN_ODD"
  | "EVEN_ODD_ADVANCED"
  | "OVER1_UNDER8"
  | "OVER2_UNDER7"
  | "OVER3_UNDER6"
  | "UNDER6"
  | "DIFFERS"
  | "SUPER_DIFFERS"
  | "OVER_UNDER_ADVANCED"

export class AutoBot {
  private api: DerivAPIClient
  private config: AutoBotConfig
  private state: AutoBotState
  private strategy: BotStrategy
  private tickHistory: number[] = []
  private onStateUpdate: ((state: AutoBotState) => void) | null = null
  private tradesThisMinute = 0
  private minuteResetTimer: NodeJS.Timeout | null = null
  private currentSignal: { status: "WAIT" | "TRADE_NOW" | "NEUTRAL"; level: number } = { status: "NEUTRAL", level: 0 }
  private waitTickCount = 0
  private differsPreviousDigitPercent = 0
  private differsSelectedDigit: number | null = null
  private differsWaitCycle = 0
  private activeProposals: Map<string, { proposalData: any; timestamp: number }> = new Map()
  private activeContracts: Map<number, { contractData: any; entryTime: number }> = new Map()
  private currentAnalysis: any = null
  private proposalMetrics: {
    probabilities: number[]
    winRates: number[]
    payouts: number[]
  } = { probabilities: [], winRates: [], payouts: [] }

  constructor(api: DerivAPIClient, strategy: BotStrategy, config: AutoBotConfig) {
    this.api = api
    this.strategy = strategy
    this.config = config
    this.state = {
      isRunning: false,
      totalRuns: 0,
      wins: 0,
      losses: 0,
      profitLoss: 0,
      profitLossPercent: 0,
      currentStake: config.initialStake,
      consecutiveLosses: 0,
      trades: [],
    }
  }

  // Start the bot
  async start(onStateUpdate: (state: AutoBotState) => void) {
    if (this.state.isRunning) return

    this.onStateUpdate = onStateUpdate
    this.state.isRunning = true
    this.state.currentStake = this.config.initialStake

    console.log(`[v0] 🤖 Starting ${this.strategy} bot`)

    // Reset trades per minute counter
    this.minuteResetTimer = setInterval(() => {
      this.tradesThisMinute = 0
    }, 60000)

    try {
      // Fetch initial tick history
      await this.fetchTickHistory()

      // Start continuous trading loop
      this.runTradingLoop()
    } catch (error: any) {
      console.error(`[v0] Failed to start bot:`, error.message)
      this.state.isRunning = false
      if (this.minuteResetTimer) {
        clearInterval(this.minuteResetTimer)
        this.minuteResetTimer = null
      }
      throw error
    }
  }

  // Stop the bot
  stop() {
    this.state.isRunning = false
    if (this.minuteResetTimer) {
      clearInterval(this.minuteResetTimer)
      this.minuteResetTimer = null
    }
    console.log(`[v0] ⏹️ ${this.strategy} bot stopped`)
    this.updateUI()
  }

  // Main trading loop
  private async runTradingLoop() {
    while (this.state.isRunning) {
      // Check stop conditions
      if (this.shouldStop()) {
        this.stop()
        break
      }

      // Check rate limit
      if (this.tradesThisMinute >= this.config.maxTradesPerMinute) {
        await this.delay(1000)
        continue
      }

      try {
        // Analyze and get trade signal
        const signal = await this.analyzeAndGetSignal()

        if (!signal) {
          await this.delay(this.config.cooldownMs)
          continue
        }

        console.log(`[v0] 📊 Signal generated: ${JSON.stringify(signal)}`)
        console.log(`[v0] 💰 Current stake: $${this.state.currentStake}, Balance: $${this.config.balance}`)

        // Fetch proposal with analysis data
        const { proposal, analysis, probability } = await this.fetchProposalWithAnalysis(
          signal.contractType,
          signal.prediction,
        )

        console.log(`[v0] 📈 Analysis - Probability: ${probability.toFixed(1)}%, Payout: $${proposal.payout}`)

        // Execute trade
        const result = await this.executeTrade(signal.contractType, signal.prediction)

        console.log(`[v0] 🎲 Trade result: ${result.isWin ? "WIN" : "LOSS"}, Profit: $${result.profit.toFixed(2)}`)

        // Process result
        this.handleTradeResult(result)
        this.tradesThisMinute++

        // Cooldown between trades
        await this.delay(this.config.cooldownMs)
      } catch (error: any) {
        console.error(`[v0] Error in trading loop:`, error.message)
        // Don't stop bot on single error, just continue after delay
        await this.delay(5000)
      }
    }
  }

  // Fetch tick history
  private async fetchTickHistory() {
    try {
      const response = await this.api.getTickHistory(this.config.symbol, this.config.historyCount)
      this.tickHistory = response.prices.map((price: number) => {
        const priceStr = price.toFixed(5)
        const lastDigit = Number.parseInt(priceStr[priceStr.length - 1])
        return lastDigit
      })
      console.log(`[v0] 📈 Fetched ${this.tickHistory.length} ticks for ${this.strategy}`)
    } catch (error: any) {
      console.error(`[v0] ❌ Failed to fetch tick history:`, error)
    }
  }

  // Analyze market and get trade signal
  private async analyzeAndGetSignal(): Promise<{ contractType: string; prediction?: string } | null> {
    try {
      const response = await this.api.getTickHistory(this.config.symbol, 50)
      const latestDigits = response.prices.map((price: number) => {
        const priceStr = price.toFixed(5)
        return Number.parseInt(priceStr[priceStr.length - 1])
      })

      // Update our tick history with latest data
      this.tickHistory = [...this.tickHistory, ...latestDigits].slice(-this.config.historyCount)
    } catch (error: any) {
      console.error(`[v0] Failed to refresh tick history:`, error)
      // Continue with existing history if update fails
    }

    const last25 = this.tickHistory.slice(-25)
    const last50 = this.tickHistory.slice(-50)
    const last10 = this.tickHistory.slice(-10)

    if (last25.length < 25) return null

    switch (this.strategy) {
      case "EVEN_ODD":
        return this.analyzeEvenOdd(last10, last50)
      case "EVEN_ODD_ADVANCED":
        return this.analyzeEvenOddAdvanced(last10, last50)
      case "OVER1_UNDER8":
        return this.analyzeOver1Under8(last25)
      case "OVER2_UNDER7":
        return this.analyzeOver2Under7(last25)
      case "OVER3_UNDER6":
        return this.analyzeOver3Under6(last25)
      case "UNDER6":
        return this.analyzeUnder6(last25)
      case "DIFFERS":
        return this.analyzeDiffers(last25)
      case "SUPER_DIFFERS":
        return this.analyzeSuperDiffers(last25)
      case "OVER_UNDER_ADVANCED":
        return this.analyzeOverUnderAdvanced(last25)
      default:
        return null
    }
  }

  // Strategy 1: EVEN/ODD Bot
  private analyzeEvenOdd(last10: number[], last50: number[]): { contractType: string } | null {
    if (last10.length < 10 || last50.length < 50) return null

    const evenLast10 = last10.filter((d) => d % 2 === 0).length
    const evenLast50 = last50.filter((d) => d % 2 === 0).length

    const evenPercentLast10 = (evenLast10 / 10) * 100
    const evenPercentLast50 = (evenLast50 / 50) * 100

    const evenIncreasing = evenPercentLast10 > evenPercentLast50
    const maxPercent = Math.max(evenPercentLast10, 100 - evenPercentLast10)

    if (maxPercent >= 56 && evenIncreasing) {
      return { contractType: evenPercentLast10 > 50 ? "DIGITEVEN" : "DIGITODD" }
    }

    return null
  }

  // Strategy 2: EVEN/ODD Advanced Bot
  private analyzeEvenOddAdvanced(last10: number[], last50: number[]): { contractType: string } | null {
    if (last10.length < 10 || last50.length < 50) return null

    const evenLast10 = last10.filter((d) => d % 2 === 0).length
    const evenLast50 = last50.filter((d) => d % 2 === 0).length

    const evenPercentLast10 = (evenLast10 / 10) * 100
    const evenPercentLast50 = (evenLast50 / 50) * 100

    const evenIncreasing = evenPercentLast10 > evenPercentLast50
    const maxPercent = Math.max(evenPercentLast10, 100 - evenPercentLast10)

    if (maxPercent >= 60 && evenIncreasing) {
      return { contractType: evenPercentLast10 > 50 ? "DIGITEVEN" : "DIGITODD" }
    } else if (maxPercent >= 56 && evenIncreasing) {
      return { contractType: evenPercentLast10 > 50 ? "DIGITEVEN" : "DIGITODD" }
    }

    return null
  }

  // Strategy 3: OVER1/UNDER8 Bot
  private analyzeOver1Under8(digits: number[]): { contractType: string; prediction?: string } | null {
    return this.analyzeOverUnderRange(digits, 2, 7)
  }

  // Strategy 4: OVER2/UNDER7 Bot
  private analyzeOver2Under7(digits: number[]): { contractType: string; prediction?: string } | null {
    return this.analyzeOverUnderRange(digits, 3, 6)
  }

  // Strategy 5: OVER3/UNDER6 Bot
  private analyzeOver3Under6(digits: number[]): { contractType: string; prediction?: string } | null {
    return this.analyzeOverUnderRange(digits, 4, 5)
  }

  // Helper function for Over/Under Bots
  private analyzeOverUnderRange(
    digits: number[],
    overThreshold: number,
    underThreshold: number,
  ): { contractType: string; prediction?: string } | null {
    if (digits.length < 25) return null

    const overCount = digits.filter((d) => d >= overThreshold).length
    const underCount = digits.filter((d) => d <= underThreshold).length

    const overPercent = (overCount / digits.length) * 100
    const underPercent = (underCount / digits.length) * 100
    const maxPercent = Math.max(overPercent, underPercent)

    // 53% increasing = WAIT, 56% = WAIT, 60% = TRADE NOW with Strong Signal
    if (maxPercent >= 60) {
      if (overPercent > underPercent) {
        return { contractType: "DIGITOVER", prediction: (overThreshold - 1).toString() }
      } else {
        return { contractType: "DIGITUNDER", prediction: (underThreshold + 1).toString() }
      }
    } else if (maxPercent >= 56) {
      if (overPercent > underPercent) {
        return { contractType: "DIGITOVER", prediction: (overThreshold - 1).toString() }
      } else {
        return { contractType: "DIGITUNDER", prediction: (underThreshold + 1).toString() }
      }
    }

    return null
  }

  // Strategy 6: UNDER6 Bot
  private analyzeUnder6(digits: number[]): { contractType: string; prediction?: string } | null {
    if (digits.length < 25) return null

    const under4Count = digits.filter((d) => d <= 5).length
    const under4Percent = (under4Count / digits.length) * 100

    if (under4Percent >= 50) {
      return { contractType: "DIGITUNDER", prediction: "6" }
    }

    return null
  }

  // Strategy 7: DIFFERS Bot
  private analyzeDiffers(digits: number[]): { contractType: string; prediction: string } | null {
    if (digits.length < 25) return null

    const frequency: Record<number, number> = {}
    for (let i = 2; i <= 7; i++) {
      frequency[i] = 0
    }

    // Only count digits 2-7
    digits.forEach((d) => {
      if (d >= 2 && d <= 7) {
        frequency[d]++
      }
    })

    // Find digit with lowest frequency (most appearing digit for reference)
    let selectedDigit = this.differsSelectedDigit || 2
    let minCount = digits.length
    let maxCount = 0
    let mostAppearingDigit = 2

    for (let i = 2; i <= 7; i++) {
      if (frequency[i] < minCount) {
        minCount = frequency[i]
        selectedDigit = i
      }
      if (frequency[i] > maxCount) {
        maxCount = frequency[i]
        mostAppearingDigit = i
      }
    }

    const selectedPercent = (frequency[selectedDigit] / digits.length) * 100
    const mostAppearingPercent = (frequency[mostAppearingDigit] / digits.length) * 100

    // Store selected digit if it's the first time or we reset
    if (!this.differsSelectedDigit || this.differsSelectedDigit !== selectedDigit) {
      this.differsSelectedDigit = selectedDigit
      this.differsPreviousDigitPercent = selectedPercent
      this.differsWaitCycle = 0
    }

    // Check if chosen digit is decreasing and most appearing is increasing
    const chosenDigitDecreasing = selectedPercent < this.differsPreviousDigitPercent
    const mostAppearingIncreasing = mostAppearingPercent > 15 // Threshold for "increasing power"

    // Check if chosen digit is increasing (stop trading)
    const chosenDigitIncreasing = selectedPercent > this.differsPreviousDigitPercent

    console.log(
      `[v0] DIFFERS Analysis: Selected=${selectedDigit} (${selectedPercent.toFixed(1)}%), MostAppearing=${mostAppearingDigit} (${mostAppearingPercent.toFixed(1)}%), Decreasing=${chosenDigitDecreasing}, Increasing=${chosenDigitIncreasing}`,
    )

    // If chosen digit appears in last 3 ticks, restart cycle
    const last3 = digits.slice(-3)
    const digitAppearedInLast3 = last3.includes(selectedDigit)

    if (digitAppearedInLast3) {
      console.log(`[v0] DIFFERS: Digit ${selectedDigit} appeared in last 3 ticks, restarting cycle`)
      this.differsWaitCycle = 0
      this.differsSelectedDigit = null // Reset to find new digit
      return null
    }

    // If chosen digit is increasing in power, stop/wait
    if (chosenDigitIncreasing) {
      console.log(`[v0] DIFFERS: Digit ${selectedDigit} increasing in power, waiting...`)
      return null
    }

    // Core entry logic: digit <10% occurrence
    if (selectedPercent < 10) {
      // If chosen digit is decreasing AND most appearing is increasing, trade immediately
      if (chosenDigitDecreasing && mostAppearingIncreasing) {
        console.log(`[v0] DIFFERS: Immediate entry - chosen digit decreasing, most appearing increasing`)
        this.differsPreviousDigitPercent = selectedPercent
        return { contractType: "DIGITDIFF", prediction: selectedDigit.toString() }
      }

      // Otherwise, wait for 3 ticks without the digit
      this.differsWaitCycle++
      console.log(`[v0] DIFFERS: Wait cycle ${this.differsWaitCycle}/3 for digit ${selectedDigit}`)

      if (this.differsWaitCycle >= 3) {
        console.log(`[v0] DIFFERS: Entry after 3-tick wait for digit ${selectedDigit}`)
        this.differsWaitCycle = 0
        this.differsPreviousDigitPercent = selectedPercent
        return { contractType: "DIGITDIFF", prediction: selectedDigit.toString() }
      }
    } else {
      // Reset if digit is no longer <10%
      this.differsWaitCycle = 0
      this.differsSelectedDigit = null
    }

    this.differsPreviousDigitPercent = selectedPercent
    return null
  }

  // Strategy 8: OVER/UNDER Advanced Bot
  private analyzeOverUnderAdvanced(digits: number[]): { contractType: string; prediction?: string } | null {
    if (digits.length < 25) return null

    const over5Count = digits.filter((d) => d >= 5).length
    const under4Count = digits.filter((d) => d <= 4).length

    const over5Percent = (over5Count / digits.length) * 100
    const under4Percent = (under4Count / digits.length) * 100
    const maxPercent = Math.max(over5Percent, under4Percent)

    // Multi-level: 53%=WAIT, 56%+=WAIT, 60%+=STRONG signal with TRADE NOW
    if (maxPercent >= 60) {
      if (over5Percent > under4Percent) {
        return { contractType: "DIGITOVER", prediction: "1" }
      } else {
        return { contractType: "DIGITUNDER", prediction: "8" }
      }
    } else if (maxPercent >= 56) {
      if (over5Percent > under4Percent) {
        return { contractType: "DIGITOVER", prediction: "1" }
      } else {
        return { contractType: "DIGITUNDER", prediction: "8" }
      }
    } else if (maxPercent >= 53) {
      // WAIT signal at 53% - don't trade yet
      return null
    }

    return null
  }

  // Execute trade
  private async executeTrade(
    contractType: string,
    prediction?: string,
  ): Promise<{ isWin: boolean; profit: number; payout: number }> {
    let duration = this.config.duration
    let durationUnit = this.config.durationUnit

    // Digit contracts require minimum 1 tick, max handled by API
    if (contractType.includes("DIGIT")) {
      if (duration < 1) {
        duration = 1
      }
      durationUnit = "t"
    }

    const tradeParams: any = {
      symbol: this.config.symbol,
      contract_type: contractType,
      amount: this.state.currentStake,
      basis: "stake",
      duration: duration,
      duration_unit: durationUnit,
      currency: "USD",
    }

    // Add barrier for contracts that require it (DIGITDIFF, DIGITMATCH, DIGITOVER, DIGITUNDER)
    if (prediction !== null && prediction !== undefined) {
      tradeParams.barrier = String(prediction)
    }

    try {
      const proposalRequest = {
        proposal: 1,
        ...tradeParams,
      }

      const proposalResponse = await this.api.send(proposalRequest)

      if (proposalResponse.error) {
        throw new Error(proposalResponse.error.message)
      }

      const proposal = proposalResponse.proposal

      const buyResponse = await this.api.send({
        buy: proposal.id,
        price: proposal.ask_price,
      })

      if (buyResponse.error) {
        throw new Error(buyResponse.error.message)
      }

      const contract = buyResponse.buy

      // Monitor until completion using subscription
      const result = await this.monitorContract(contract.contract_id)

      return {
        isWin: result.profit > 0,
        profit: result.profit,
        payout: result.payout,
      }
    } catch (error: any) {
      console.error(`[v0] Trade execution error:`, error)
      throw error
    }
  }

  private async monitorContract(contractId: number): Promise<{ profit: number; payout: number }> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Contract monitoring timeout"))
      }, 60000) // 60 seconds for digit contracts

      // Subscribe to contract updates
      this.api.send({
        proposal_open_contract: 1,
        contract_id: contractId,
        subscribe: 1,
      })

      const handler = (response: any) => {
        if (response.proposal_open_contract && response.proposal_open_contract.contract_id === contractId) {
          const contract = response.proposal_open_contract

          // Check if contract is settled
          if (contract.is_sold || contract.is_expired || contract.status !== "open") {
            clearTimeout(timeout)
            const profit = contract.profit || 0
            const payout = contract.payout || 0

            // Cleanup subscription
            if (response.subscription) {
              this.api.send({ forget: response.subscription.id })
            }

            resolve({ profit, payout })
          }
        }
      }

      // Listen for contract updates
      if (this.api.on) {
        this.api.on("proposal_open_contract", handler)
      }
    })
  }

  // Handle trade result
  private handleTradeResult(result: { isWin: boolean; profit: number; payout: number }) {
    this.state.totalRuns++

    const tradeLog: TradeLog = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      contract: this.strategy,
      prediction: result.isWin ? "WIN" : "LOSS",
      result: result.isWin ? "WIN" : "LOSS",
      profitLoss: result.profit,
      stake: this.state.currentStake,
    }

    this.state.trades.unshift(tradeLog)
    if (this.state.trades.length > 50) {
      this.state.trades.pop()
    }

    if (result.isWin) {
      this.state.wins++
      this.state.profitLoss += result.profit
      this.state.currentStake = this.config.initialStake
      this.state.consecutiveLosses = 0
      console.log(
        `[v0] ✅ ${this.strategy} WIN! Profit: $${result.profit.toFixed(2)} (Payout: $${result.payout.toFixed(2)})`,
      )
    } else {
      this.state.losses++
      this.state.profitLoss += result.profit // profit is negative for loss
      this.state.consecutiveLosses++

      if (this.config.useMartingale && this.config.martingaleMultiplier > 1) {
        const newStake = this.state.currentStake * this.config.martingaleMultiplier
        // Cap stake to not exceed 50% of balance for safety
        this.state.currentStake = Math.min(newStake, this.config.balance * 0.5)
        console.log(
          `[v0] 📈 Martingale applied: Stake increased from $${(newStake / this.config.martingaleMultiplier).toFixed(2)} to $${this.state.currentStake.toFixed(2)} (Multiplier: ${this.config.martingaleMultiplier}x)`,
        )
      }

      console.log(`[v0] ❌ ${this.strategy} LOSS! Loss: $${Math.abs(result.profit).toFixed(2)}`)
    }

    this.state.profitLossPercent = (this.state.profitLoss / this.config.balance) * 100

    this.updateUI()
  }

  // Check if should stop
  private shouldStop(): boolean {
    const tpAmount = (this.config.balance * this.config.tpPercent) / 100
    const slAmount = -(this.config.balance * this.config.slPercent) / 100

    if (this.state.profitLoss >= tpAmount) {
      console.log(`[v0] 🎯 ${this.strategy}: Take Profit reached!`)
      return true
    }

    if (this.state.profitLoss <= slAmount) {
      console.log(`[v0] 🛑 ${this.strategy}: Stop Loss hit!`)
      return true
    }

    return false
  }

  // Update UI
  private updateUI() {
    if (this.onStateUpdate) {
      this.onStateUpdate({ ...this.state })
    }
  }

  // Delay helper
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // Get state
  getState(): AutoBotState {
    return { ...this.state }
  }

  private async fetchProposalWithAnalysis(
    contractType: string,
    prediction?: string,
  ): Promise<{ proposal: any; analysis: any; probability: number }> {
    const tradeParams: any = {
      symbol: this.config.symbol,
      contract_type: contractType,
      amount: this.state.currentStake,
      basis: "stake",
      duration: this.config.duration,
      duration_unit: this.config.durationUnit,
      currency: "USD",
    }

    if (prediction !== null && prediction !== undefined) {
      tradeParams.barrier = String(prediction)
    }

    try {
      console.log(`[v0] Fetching proposal for ${contractType}...`, tradeParams)
      const proposal = await this.api.getProposal(tradeParams)

      const lastDigit = this.tickHistory[this.tickHistory.length - 1]
      const recentTicks = this.tickHistory.slice(-10)
      const avgPrice = recentTicks.reduce((sum, d) => sum + d, 0) / recentTicks.length

      // Calculate analysis metrics
      const analysis = {
        currentPrice: avgPrice,
        lastDigit,
        contractType,
        prediction,
        market: this.config.symbol,
        proposal: {
          id: proposal.id,
          askPrice: proposal.ask_price,
          payout: proposal.payout,
          spot: proposal.spot,
          spotTime: proposal.spot_time,
          longcode: proposal.longcode,
        },
      }

      // Calculate probability based on analysis
      const probability = this.calculateProbability(contractType, lastDigit)

      // Track proposal metrics
      this.proposalMetrics.probabilities.push(probability)
      this.proposalMetrics.payouts.push(proposal.payout)

      this.currentAnalysis = analysis

      console.log(`[v0] Proposal fetched - Payout: $${proposal.payout}, Probability: ${probability.toFixed(1)}%`)

      return {
        proposal,
        analysis,
        probability,
      }
    } catch (error: any) {
      console.error(`[v0] Proposal fetch failed:`, error)
      throw error
    }
  }

  private calculateProbability(contractType: string, lastDigit: number): number {
    const recent10 = this.tickHistory.slice(-10)
    const recent50 = this.tickHistory.slice(-50)

    if (recent10.length < 10) return 50

    switch (this.strategy) {
      case "EVEN_ODD":
      case "EVEN_ODD_ADVANCED": {
        const evenCount = recent10.filter((d) => d % 2 === 0).length
        const evenPercent = (evenCount / 10) * 100
        return Math.max(50, Math.min(85, 50 + (evenPercent - 50)))
      }

      case "OVER3_UNDER6":
      case "OVER2_UNDER7":
      case "OVER1_UNDER8": {
        const threshold = contractType === "DIGITOVER" ? 5 : 4
        const overCount = recent10.filter((d) => d >= threshold).length
        const overPercent = (overCount / 10) * 100
        return Math.max(50, Math.min(85, 50 + (overPercent - 50)))
      }

      case "UNDER6": {
        const underCount = recent10.filter((d) => d <= 5).length
        const underPercent = (underCount / 10) * 100
        return Math.max(50, Math.min(85, 50 + (underPercent - 50)))
      }

      case "DIFFERS": {
        const lastDigitCount = recent50.filter((d) => d === lastDigit).length
        const lastDigitPercent = (lastDigitCount / recent50.length) * 100
        return Math.max(55, Math.min(90, 100 - lastDigitPercent))
      }

      case "OVER_UNDER_ADVANCED": {
        const over5Count = recent10.filter((d) => d >= 5).length
        const over5Percent = (over5Count / 10) * 100
        return Math.max(50, Math.min(90, 50 + Math.abs(over5Percent - 50)))
      }

      default:
        return 55
    }
  }

  getCurrentAnalysis(): any {
    return {
      analysis: this.currentAnalysis,
      proposalMetrics: {
        avgProbability: this.proposalMetrics.probabilities.length
          ? this.proposalMetrics.probabilities.reduce((a, b) => a + b, 0) / this.proposalMetrics.probabilities.length
          : 0,
        avgPayout:
          this.proposalMetrics.payouts.length > 0
            ? this.proposalMetrics.payouts.reduce((a, b) => a + b, 0) / this.proposalMetrics.payouts.length
            : 0,
        totalProposals: this.activeProposals.size + this.activeContracts.size,
      },
    }
  }

  // Strategy 9: SUPER DIFFERS Bot - Simple 3-tick wait logic
  private analyzeSuperDiffers(digits: number[]): { contractType: string; prediction: string } | null {
    if (digits.length < 25) return null

    const frequency: Record<number, number> = {}
    for (let i = 2; i <= 7; i++) {
      frequency[i] = 0
    }

    // Only count digits 2-7
    digits.forEach((d) => {
      if (d >= 2 && d <= 7) {
        frequency[d]++
      }
    })

    // Find digit with lowest frequency
    let selectedDigit = this.differsSelectedDigit || 2
    let minCount = digits.length

    for (let i = 2; i <= 7; i++) {
      if (frequency[i] < minCount) {
        minCount = frequency[i]
        selectedDigit = i
      }
    }

    const selectedPercent = (frequency[selectedDigit] / digits.length) * 100

    // Store selected digit if it's the first time
    if (!this.differsSelectedDigit || this.differsSelectedDigit !== selectedDigit) {
      this.differsSelectedDigit = selectedDigit
      this.differsWaitCycle = 0
    }

    console.log(`[v0] SUPER DIFFERS: Selected digit=${selectedDigit} (${selectedPercent.toFixed(1)}%)`)

    // Core entry logic: digit <10% occurrence
    if (selectedPercent < 10) {
      // Check if chosen digit appears in last 3 ticks
      const last3 = digits.slice(-3)
      const digitAppearedInLast3 = last3.includes(selectedDigit)

      if (digitAppearedInLast3) {
        console.log(`[v0] SUPER DIFFERS: Digit ${selectedDigit} appeared in last 3 ticks, restarting cycle`)
        this.differsWaitCycle = 0
        this.differsSelectedDigit = null // Reset to find new digit
        return null
      }

      // Wait for 3 ticks without the digit
      this.differsWaitCycle++
      console.log(`[v0] SUPER DIFFERS: Wait cycle ${this.differsWaitCycle}/3 for digit ${selectedDigit}`)

      if (this.differsWaitCycle >= 3) {
        console.log(`[v0] SUPER DIFFERS: Entry after 3-tick wait for digit ${selectedDigit}`)
        this.differsWaitCycle = 0
        return { contractType: "DIGITDIFF", prediction: selectedDigit.toString() }
      }
    } else {
      // Reset if digit is no longer <10%
      this.differsWaitCycle = 0
      this.differsSelectedDigit = null
    }

    return null
  }
}
