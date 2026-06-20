"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Shield, User, TrendingUp, Settings, CheckCircle2 } from "lucide-react"

interface ApprovalModalProps {
  open: boolean
  onApprove: () => void
  onCancel: () => void
}

export function ApprovalModal({ open, onApprove, onCancel }: ApprovalModalProps) {
  const [loading, setLoading] = useState(false)

  const handleApprove = () => {
    setLoading(true)
    onApprove()
  }

  const permissions = [
    { icon: User, text: "Read your user profile" },
    { icon: TrendingUp, text: "Read your trading information" },
    { icon: TrendingUp, text: "Execute trades on your behalf" },
    { icon: Settings, text: "Manage your account settings" },
  ]

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Shield className="h-6 w-6 text-blue-500" />
            </div>
            <DialogTitle className="text-xl">Approve Application</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            Benatradinghub would like to connect to your Deriv account.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">This application will be able to:</p>
          <div className="space-y-3">
            {permissions.map((permission, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="p-1.5 bg-green-500/10 rounded-md mt-0.5">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
                <span className="text-sm">{permission.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
            <p className="text-xs text-muted-foreground">
              You'll be redirected to Deriv's secure login page to authorize this application. Your credentials are
              never shared with Benatradinghub.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={loading}>
            {loading ? "Redirecting..." : "Approve & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
