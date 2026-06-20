"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[v0] Error caught by boundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-500/30 m-4">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-400">
              An error occurred while loading this component. Please try refreshing the page.
            </p>
            {this.state.error && (
              <details className="text-xs text-gray-500">
                <summary className="cursor-pointer text-gray-400 hover:text-gray-300">Error details</summary>
                <pre className="mt-2 p-2 bg-black/50 rounded overflow-auto">{this.state.error.message}</pre>
              </details>
            )}
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="w-full bg-red-500 hover:bg-red-600"
            >
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}
