'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CreditCard, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { mockBilling } from '@/lib/mock-data/settings'

const PLAN_NAMES: Record<string, string> = {
  starter: 'Starter Plan',
  pro: 'Pro Plan',
  enterprise: 'Enterprise Plan',
}

export function BillingTab() {
  const { toast } = useToast()
  const [billing] = useState(mockBilling)
  const [showContactModal, setShowContactModal] = useState(false)
  const [contactReason, setContactReason] = useState('')

  const handleChangePlan = () => {
    setContactReason('change your plan')
    setShowContactModal(true)
  }

  const handleCancelPlan = () => {
    setContactReason('cancel your plan')
    setShowContactModal(true)
  }

  const handleUpdatePayment = () => {
    setContactReason('update your payment method')
    setShowContactModal(true)
  }

  const handleDownloadInvoice = (invoiceId: string) => {
    toast({
      title: 'Downloading...',
      description: 'Your invoice will download shortly.',
    })
  }

  const locationsPercentage = (billing.locationsUsed / billing.locationsIncluded) * 100
  const intelligencePercentage =
    (billing.intelligenceRunsUsed / billing.intelligenceRunsIncluded) * 100

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>Your subscription details and usage.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/30 p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold">{PLAN_NAMES[billing.plan]}</h3>
                <p className="text-2xl font-bold">
                  ${billing.priceMonthly}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>{billing.locationsIncluded} locations included</li>
                  <li>{billing.intelligenceRunsIncluded} Intelligence runs/month</li>
                </ul>
                <p className="mt-4 text-sm text-muted-foreground">
                  Next billing date:{' '}
                  <span className="font-medium text-foreground">
                    {format(new Date(billing.nextBillingDate), 'MMMM d, yyyy')}
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleChangePlan}>
                  Change Plan
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleCancelPlan}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Cancel Plan
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage This Month */}
      <Card>
        <CardHeader>
          <CardTitle>Usage This Month</CardTitle>
          <CardDescription>Track your usage against your plan limits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Locations</span>
              <span className="font-medium">
                {billing.locationsUsed} of {billing.locationsIncluded}
              </span>
            </div>
            <Progress value={locationsPercentage} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Intelligence Runs</span>
              <span className="font-medium">
                {billing.intelligenceRunsUsed} of {billing.intelligenceRunsIncluded}
              </span>
            </div>
            <Progress value={intelligencePercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>Your saved payment method.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">
                  {billing.paymentMethod.brand} ending in {billing.paymentMethod.last4}
                </p>
                <p className="text-sm text-muted-foreground">
                  Expires {billing.paymentMethod.expMonth}/{billing.paymentMethod.expYear}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleUpdatePayment}>
              Update
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Download past invoices.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-lg border">
            {billing.invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(invoice.date), 'MMM d, yyyy')}
                  </span>
                  <span className="text-sm font-medium">{invoice.description}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">
                    ${invoice.amount.toFixed(2)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownloadInvoice(invoice.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Modal */}
      <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Us</DialogTitle>
            <DialogDescription>
              To {contactReason}, please contact our support team and we&apos;ll be happy
              to help.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              Email:{' '}
              <a
                href="mailto:support@prometheus.io"
                className="text-primary hover:underline"
              >
                support@prometheus.io
              </a>
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowContactModal(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
