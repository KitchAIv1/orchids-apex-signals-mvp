import { Suspense } from 'react'
import { Navbar } from '@/components/shared/Navbar'
import { DisclaimerBanner } from '@/components/shared/DisclaimerBanner'
import { PaperTradingDashboard } from '@/components/shared/PaperTradingDashboard'
import { Loader2 } from 'lucide-react'

export default function PaperTradingPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
            Paper Trading
          </h1>
          <p className="text-zinc-400">
            Practice trading with $100,000 virtual capital using real market prices
          </p>
        </div>
        
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>}>
          <PaperTradingDashboard />
        </Suspense>
        
        <div className="mt-8">
          <DisclaimerBanner />
        </div>
      </main>
    </div>
  )
}