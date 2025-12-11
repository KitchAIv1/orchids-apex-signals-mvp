import { StockList } from '@/components/Dashboard/StockList'
import { Navbar } from '@/components/shared/Navbar'
import { DisclaimerBanner } from '@/components/shared/DisclaimerBanner'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
            Stock Analysis Dashboard
          </h1>
          <p className="text-zinc-400">
            AI-powered multi-agent analysis across 23 curated stocks
          </p>
        </div>
        
        <StockList />
        
        <div className="mt-8">
          <DisclaimerBanner />
        </div>
      </main>
    </div>
  )
}
