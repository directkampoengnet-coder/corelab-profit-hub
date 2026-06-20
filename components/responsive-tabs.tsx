"use client"

import React from "react"
import { TabsList } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface ResponsiveTabsProps {
  children: React.ReactNode
  theme?: "light" | "dark"
}

export function ResponsiveTabs({ children, theme = "dark" }: ResponsiveTabsProps) {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false)
  const [selectedTab, setSelectedTab] = React.useState<string>("smart-analysis")

  React.useEffect(() => {
    const updateActiveTab = () => {
      const activeTrigger = document.querySelector('[role="tab"][data-state="active"]')
      if (activeTrigger) {
        const tabValue = activeTrigger.getAttribute("value")
        if (tabValue && tabValue !== selectedTab) {
          setSelectedTab(tabValue)
        }
      }
    }

    updateActiveTab()

    const observer = new MutationObserver(updateActiveTab)
    const tabsList = document.querySelector('[role="tablist"]')
    if (tabsList) {
      observer.observe(tabsList, {
        attributes: true,
        subtree: true,
        attributeFilter: ["data-state"],
      })
    }

    return () => observer.disconnect()
  }, [selectedTab])

  const handleTabClick = (tabValue: string) => {
    setSelectedTab(tabValue)
    setIsDropdownOpen(false)

    const tabTrigger = document.querySelector(`[role="tab"][value="${tabValue}"]`) as HTMLElement
    if (tabTrigger) {
      tabTrigger.click()
    }
  }

  const getTabLabel = (value: string) => {
    const child = React.Children.toArray(children).find((c) => React.isValidElement(c) && c.props.value === value)
    if (React.isValidElement(child)) {
      return child.props.children || value.replace(/-/g, " ")
    }
    return value.replace(/-/g, " ")
  }

  return (
    <>
      <div className="md:hidden px-2 py-2">
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={`w-full flex items-center justify-between text-sm font-medium h-10 backdrop-blur-md ${
                theme === "dark"
                  ? "bg-[#0f1629]/60 border-green-500/30 text-white hover:bg-[#1a2235]/70"
                  : "bg-white/60 border-gray-300 text-gray-900 hover:bg-white/80"
              }`}
            >
              <span className="capitalize truncate">{getTabLabel(selectedTab)}</span>
              <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className={`w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto backdrop-blur-xl ${theme === "dark" ? "bg-[#0a0e27]/95 border-green-500/30" : "bg-white/95 border-gray-300"}`}
          >
            {React.Children.map(children, (child) => {
              if (React.isValidElement(child)) {
                const tabValue = child.props.value
                const tabLabel = child.props.children
                return (
                  <DropdownMenuItem
                    key={tabValue}
                    onClick={() => handleTabClick(tabValue)}
                    className={`cursor-pointer py-3 text-sm ${
                      selectedTab === tabValue
                        ? theme === "dark"
                          ? "bg-green-500/20 text-green-400 font-semibold"
                          : "bg-green-100 text-green-700 font-semibold"
                        : theme === "dark"
                          ? "hover:bg-white/10"
                          : "hover:bg-gray-100"
                    }`}
                  >
                    {tabLabel}
                  </DropdownMenuItem>
                )
              }
              return null
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TabsList
        className={`hidden md:flex w-full justify-start bg-transparent border-0 h-auto p-0 gap-0 overflow-x-auto flex-nowrap scrollbar-thin scrollbar-thumb-green-500/50 scrollbar-track-transparent ${
          theme === "dark" ? "border-green-500/20" : "border-gray-200"
        }`}
      >
        {children}
      </TabsList>
    </>
  )
}
