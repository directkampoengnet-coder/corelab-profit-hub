"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Download, Upload, FileText, Bot, HelpCircle, BookOpen, Zap } from "lucide-react"

interface HelpTabProps {
  theme?: "light" | "dark"
}

interface BotFile {
  id: string
  name: string
  description: string
  uploadDate: string
  downloads: number
  type: "bot" | "strategy"
}

interface HelpSection {
  id: string
  title: string
  description: string
  content: string
  icon: React.ReactNode
}

export function HelpTab({ theme = "dark" }: HelpTabProps) {
  const [isAdmin] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadType, setUploadType] = useState<"bot" | "strategy">("bot")
  const [activeHelpSection, setActiveHelpSection] = useState<string>("getting-started")

  const [bots] = useState<BotFile[]>([
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
  ])

  const [strategies] = useState<BotFile[]>([
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
  ])

  const helpSections: HelpSection[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      description: "Learn the basics",
      icon: <BookOpen className="w-5 h-5" />,
      content: `
        Welcome to Profit Hub! Here's how to get started:
        
        1. Connect Your API: Go to the top of the page and enter your Deriv API token
        2. Select a Market: Choose from available volatility indices
        3. Analyze Signals: Watch real-time signals from the analysis tabs
        4. Execute Trades: Use Trade Now tab or AutoBots for automated trading
        
        For best results, analyze market conditions for at least 30 seconds before making trades.
      `,
    },
    {
      id: "signals",
      title: "Understanding Signals",
      description: "Signal types and meanings",
      icon: <Zap className="w-5 h-5" />,
      content: `
        Profit Hub generates multiple signal types:
        
        TRADE NOW (Green): Market conditions are optimal for trading
        WAIT (Blue): Market is building power, watch for TRADE NOW signal
        NEUTRAL (Gray): No clear signal detected
        
        Each signal includes:
        - Probability: Win rate percentage
        - Entry Condition: Exact conditions for entering trade
        - Target: Which contracts to trade
      `,
    },
    {
      id: "analysis-tabs",
      title: "Analysis Tabs",
      description: "Different analysis methods",
      icon: <HelpCircle className="w-5 h-5" />,
      content: `
        Smart Analysis: Overall market overview with digit distribution
        Signals: Main trading signals with recommendations
        Pro Signals: Advanced signals for experienced traders
        Even/Odd: Analyzes digit parity trends
        Over/Under: Analyzes digit range trends (0-4 vs 5-9)
        Differs: Identifies least appearing digits
        AI Analysis: Machine learning based predictions
        
        SmartAuto24: Automated bot with martingale strategy
        Trade Now: Manual trade execution interface
      `,
    },
  ]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = () => {
    if (!selectedFile) return
    console.log("Uploading:", selectedFile.name, "Type:", uploadType)
    alert(`${uploadType === "bot" ? "Bot" : "Strategy"} uploaded successfully!`)
    setSelectedFile(null)
  }

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
      {/* Help Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {helpSections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveHelpSection(section.id)}
            className={`p-4 rounded-lg border text-left transition-all ${
              activeHelpSection === section.id
                ? theme === "dark"
                  ? "bg-blue-500/20 border-blue-500/50 shadow-lg"
                  : "bg-blue-50 border-blue-400 shadow-lg"
                : theme === "dark"
                  ? "bg-[#0f1629]/50 border-blue-500/20 hover:border-blue-500/30"
                  : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className={`flex items-center gap-2 mb-2 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>
              {section.icon}
              <h3 className="font-bold">{section.title}</h3>
            </div>
            <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>{section.description}</p>
          </button>
        ))}
      </div>

      {/* Active Help Section */}
      <Card
        className={
          theme === "dark"
            ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20"
            : "bg-white border-gray-200"
        }
      >
        <CardHeader>
          <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>
            {helpSections.find((s) => s.id === activeHelpSection)?.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`whitespace-pre-line text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
            {helpSections.find((s) => s.id === activeHelpSection)?.content}
          </p>
        </CardContent>
      </Card>

      {/* Admin Upload Section */}
      {isAdmin && (
        <Card
          className={
            theme === "dark"
              ? "bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30"
              : "bg-purple-50 border-purple-200"
          }
        >
          <CardHeader>
            <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>Admin Upload</CardTitle>
            <CardDescription className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
              Upload new bots (XML) or strategies (PDF)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                variant={uploadType === "bot" ? "default" : "outline"}
                onClick={() => setUploadType("bot")}
                className={uploadType === "bot" ? "bg-blue-500 hover:bg-blue-600" : ""}
              >
                <Bot className="w-4 h-4 mr-2" />
                Bot (XML)
              </Button>
              <Button
                variant={uploadType === "strategy" ? "default" : "outline"}
                onClick={() => setUploadType("strategy")}
                className={uploadType === "strategy" ? "bg-green-500 hover:bg-green-600" : ""}
              >
                <FileText className="w-4 h-4 mr-2" />
                Strategy (PDF)
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-upload" className={theme === "dark" ? "text-white" : "text-gray-900"}>
                Select File
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept={uploadType === "bot" ? ".xml" : ".pdf"}
                onChange={handleFileSelect}
                className={theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : ""}
              />
              {selectedFile && (
                <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile}
              className="w-full bg-purple-500 hover:bg-purple-600"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload {uploadType === "bot" ? "Bot" : "Strategy"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bots Section */}
      <Card
        className={
          theme === "dark"
            ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-blue-500/20"
            : "bg-white border-gray-200"
        }
      >
        <CardHeader>
          <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>TRADING BOTS UPDATED 2025</CardTitle>
          <CardDescription className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
            Download trading bots as XML files for Deriv Bot
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bots.map((bot) => (
              <div
                key={bot.id}
                className={`p-4 rounded-lg border ${
                  theme === "dark"
                    ? "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
                    : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                } transition-all cursor-pointer`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bot className={`w-5 h-5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
                    <h3 className={`font-bold text-sm ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {bot.name}
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    XML
                  </Badge>
                </div>
                <p className={`text-xs mb-3 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  {bot.description}
                </p>
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

      {/* Strategies Section */}
      <Card
        className={
          theme === "dark"
            ? "bg-gradient-to-br from-[#0f1629]/80 to-[#1a2235]/80 border-green-500/20"
            : "bg-white border-gray-200"
        }
      >
        <CardHeader>
          <CardTitle className={theme === "dark" ? "text-white" : "text-gray-900"}>Trading Strategies</CardTitle>
          <CardDescription className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
            Download strategy guides and documentation as PDF files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                className={`p-4 rounded-lg border ${
                  theme === "dark"
                    ? "bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
                    : "bg-green-50 border-green-200 hover:bg-green-100"
                } transition-all cursor-pointer`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className={`w-5 h-5 ${theme === "dark" ? "text-green-400" : "text-green-600"}`} />
                    <h3 className={`font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                      {strategy.name}
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    PDF
                  </Badge>
                </div>
                <p className={`text-sm mb-3 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  {strategy.description}
                </p>
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
    </div>
  )
}
