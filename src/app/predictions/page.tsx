import { Navbar } from '@/components/shared/Navbar'
import { DisclaimerBanner } from '@/components/shared/DisclaimerBanner'
import { PredictionHistory } from '@/components/shared/PredictionHistory'

export default function PredictionsPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-100">
            Prediction History
          </h1>
          <p className="text-zinc-400">
            Track all AI predictions and their outcomes for complete transparency
          </p>
        </div>
        
        <PredictionHistory />
        
        <div className="mt-8">
          <DisclaimerBanner />
        </div>
      </main>
    </div>
  )
}
