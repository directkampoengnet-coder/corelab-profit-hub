"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Mail, Phone, MessageCircle, Download, FileText, Bot } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface BotFile {
  id: string
  name: string
  description: string
  uploadDate: string
  downloads: number
  type: "bot" | "strategy"
}

export function HelpPanel() {
  const openWhatsApp = () => {
    window.open("https://wa.me/254757722344", "_blank")
  }

  const bots: BotFile[] = [
    {
      id: "1",
      name: "Auto Smart Trader 2025",
      description: "Advanced automated trading bot with smart entry and exit strategies for volatility indices",
      uploadDate: "2025-01-15",
      downloads: 245,
      type: "bot",
    },
    {
      id: "2",
      name: "AUTOTRADER",
      description: "Fully automated trading system with built-in risk management and profit optimization",
      uploadDate: "2025-01-14",
      downloads: 312,
      type: "bot",
    },
    {
      id: "3",
      name: "Spfx Bot",
      description: "Specialized bot for high-frequency trading on synthetic indices with precision timing",
      uploadDate: "2025-01-13",
      downloads: 189,
      type: "bot",
    },
    {
      id: "4",
      name: "DIFFERS AUTO X",
      description: "Expert bot for Differs digit trading with advanced pattern recognition algorithms",
      uploadDate: "2025-01-12",
      downloads: 276,
      type: "bot",
    },
    {
      id: "5",
      name: "Updated Bena Speedbot V6",
      description: "Lightning-fast trading bot optimized for quick entries and exits on volatility markets",
      uploadDate: "2025-01-11",
      downloads: 198,
      type: "bot",
    },
    {
      id: "6",
      name: "Maziwaa AI",
      description: "AI-powered trading bot with adaptive learning and intelligent trade management",
      uploadDate: "2025-01-10",
      downloads: 334,
      type: "bot",
    },
    {
      id: "7",
      name: "SMART BOT 2025",
      description: "Next-generation smart bot with over/under digit prediction and martingale strategy",
      uploadDate: "2025-01-09",
      downloads: 421,
      type: "bot",
    },
    {
      id: "8",
      name: "LAS VEGAS PRO ENGLISH",
      description: "Professional-grade bot with take profit and stop loss features for disciplined trading",
      uploadDate: "2025-01-08",
      downloads: 367,
      type: "bot",
    },
    {
      id: "9",
      name: "360 Robot Brand V2",
      description: "Comprehensive all-around trading bot with multiple strategies and market coverage",
      uploadDate: "2025-01-07",
      downloads: 289,
      type: "bot",
    },
  ]

  const strategies: BotFile[] = [
    {
      id: "3",
      name: "Over/Under Strategy Guide",
      description: "Complete guide for Over/Under 4.5 trading",
      uploadDate: "2025-01-12",
      downloads: 312,
      type: "strategy",
    },
    {
      id: "4",
      name: "Rise/Fall Advanced Strategy",
      description: "Professional Rise/Fall trading techniques",
      uploadDate: "2025-01-08",
      downloads: 267,
      type: "strategy",
    },
  ]

  const handleDownload = (item: BotFile) => {
    const botFileMap: Record<string, string> = {
      "1": "/bots/auto-smart-trader-2025.xml",
      "2": "/bots/autotrader.xml",
      "3": "/bots/spfx.xml",
      "4": "/bots/differs-auto-x.xml",
      "5": "/bots/updated-bena-speedbot-v6.xml",
      "6": "/bots/maziwaa-ai.xml",
      "7": "/bots/smart-bot-2025.xml",
      "8": "/bots/las-vegas-pro-english.xml",
      "9": "/bots/360-robot-brand-v2.xml",
    }

    if (item.type === "bot" && botFileMap[item.id]) {
      const link = document.createElement("a")
      link.href = botFileMap[item.id]
      link.download = item.name.replace(/\s+/g, "-").toLowerCase() + ".xml"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      console.log("Downloading:", item.name)
      alert(`Downloading ${item.name}...`)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-white">Signal Types & Entry Rules</CardTitle>
          <CardDescription>Understanding different trading signals</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="even-odd" className="border-blue-500/20">
              <AccordionTrigger className="text-white hover:text-cyan-400">Even/Odd Signals</AccordionTrigger>
              <AccordionContent className="text-gray-400">
                <p className="mb-2">
                  <strong className="text-white">Entry Rule:</strong> Wait for 2+ consecutive opposite digits, then
                  trade the favored direction.
                </p>
                <p>
                  <strong className="text-white">Example:</strong> If Even is at 60%, wait for 2+ Odd digits, then trade
                  Even.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="over-under" className="border-blue-500/20">
              <AccordionTrigger className="text-white hover:text-cyan-400">Over/Under Signals</AccordionTrigger>
              <AccordionContent className="text-gray-400">
                <p className="mb-2">
                  <strong className="text-white">Entry Rule:</strong> Trade when the strongest digit appears and
                  over/under bias is strong (62%+).
                </p>
                <p>
                  <strong className="text-white">Example:</strong> If Over 4.5 is at 65% and digit 7 is strongest, trade
                  Over when 7 appears.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="matches" className="border-blue-500/20">
              <AccordionTrigger className="text-white hover:text-cyan-400">Matches Signals</AccordionTrigger>
              <AccordionContent className="text-gray-400">
                <p className="mb-2">
                  <strong className="text-white">Entry Rule:</strong> Trade immediately when the most frequent digit
                  appears (15%+ frequency).
                </p>
                <p>
                  <strong className="text-white">Example:</strong> If digit 3 appears 18% of the time, trade Matches 3
                  when it appears.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="differs" className="border-blue-500/20">
              <AccordionTrigger className="text-white hover:text-cyan-400">Differs Signals</AccordionTrigger>
              <AccordionContent className="text-gray-400">
                <p className="mb-2">
                  <strong className="text-white">Entry Rule:</strong> Wait for the least frequent digit to appear
                  (&lt;9%), then trade Differs immediately.
                </p>
                <p>
                  <strong className="text-white">Example:</strong> If digit 5 appears only 6% of the time, trade Differs
                  5 when it appears.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="rise-fall" className="border-blue-500/20">
              <AccordionTrigger className="text-white hover:text-cyan-400">Rise/Fall Signals</AccordionTrigger>
              <AccordionContent className="text-gray-400">
                <p className="mb-2">
                  <strong className="text-white">Entry Rule:</strong> Trade based on Bollinger Bands & CCI indicators
                  with 60%+ confidence.
                </p>
                <p>
                  <strong className="text-white">Example:</strong> If price is trending up with 65% confidence, trade
                  Rise.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-white">Strategies</CardTitle>
          <CardDescription>Pro trading strategies for higher win rates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-400">
          <div>
            <h4 className="text-white font-semibold mb-2">Pro Even/Odd Strategy</h4>
            <p className="text-sm">
              Requires 55%+ Even (or 70%+ Odd) with 2+ high-percentage digits. Wait for 3+ consecutive opposite digits
              before entering.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-2">Pro Over/Under Strategy</h4>
            <p className="text-sm">
              Over 1: Requires digits 0 and 1 &lt;10%, with 90%+ Over rate. Under 8: Requires digits 8 and 9 &lt;10%,
              with 90%+ Under rate.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-2">Pro Differs Strategy</h4>
            <p className="text-sm">
              Target digits with &lt;9% frequency for 88%+ win rate. Wait for the target digit to appear, then trade
              Differs immediately.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-green-500/20">
        <CardHeader>
          <CardTitle className="text-white">Trading Bots Library</CardTitle>
          <CardDescription>Download pre-built trading bots for Deriv</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bots.map((bot) => (
              <div
                key={bot.id}
                className="p-4 rounded-lg border bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-blue-400" />
                    <h3 className="font-bold text-sm text-white">{bot.name}</h3>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    XML
                  </Badge>
                </div>
                <p className="text-xs mb-3 text-gray-400">{bot.description}</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    <div>Uploaded: {bot.uploadDate}</div>
                    <div>Downloads: {bot.downloads}</div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(bot)}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white">Strategy Guides</CardTitle>
          <CardDescription>Documentation and strategy PDFs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                className="p-4 rounded-lg border bg-green-500/10 border-green-500/30 hover:bg-green-500/20 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-400" />
                    <h3 className="font-bold text-white">{strategy.name}</h3>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    PDF
                  </Badge>
                </div>
                <p className="text-sm mb-3 text-gray-400">{strategy.description}</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    <div>Uploaded: {strategy.uploadDate}</div>
                    <div>Downloads: {strategy.downloads}</div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(strategy)}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20">
        <CardHeader>
          <CardTitle className="text-white">About This Application</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-400 space-y-3">
          <p>
            Profit Hub is a real-time market analysis platform for Deriv trading. It provides advanced statistical
            analysis and trading signals based on digit patterns and market trends.
          </p>
          <p className="text-sm">
            <strong className="text-white">Disclaimer:</strong> This tool is for educational purposes only. Trading
            involves risk, and past performance does not guarantee future results.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-white">Contact & Support</CardTitle>
          <CardDescription>Get in touch with us</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-white">
            <Phone className="h-5 w-5 text-green-400" />
            <span>+254757722344</span>
          </div>
          <div className="flex items-center gap-3 text-white">
            <Mail className="h-5 w-5 text-blue-400" />
            <span>mbuguabenson2020@gmail.com</span>
          </div>
          <Button onClick={openWhatsApp} className="w-full bg-green-500 hover:bg-green-600 text-white">
            <MessageCircle className="h-4 w-4 mr-2" />
            Chat on WhatsApp
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
