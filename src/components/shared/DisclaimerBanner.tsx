'use client'

import { AlertTriangle } from 'lucide-react'

export function DisclaimerBanner() {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
        <p className="text-xs text-amber-200/80">
          <strong className="font-semibold text-amber-200">Not financial advice.</strong>{' '}
          Apex Signals is for informational purposes only. Always do your own research before making investment decisions.
        </p>
      </div>
    </div>
  )
}
