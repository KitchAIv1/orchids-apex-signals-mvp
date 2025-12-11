'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Props = {
  sectors: string[]
  selectedSector: string
  selectedRecommendation: string
  onSectorChange: (value: string) => void
  onRecommendationChange: (value: string) => void
}

export function FilterBar({
  sectors,
  selectedSector,
  selectedRecommendation,
  onSectorChange,
  onRecommendationChange
}: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select value={selectedSector} onValueChange={onSectorChange}>
        <SelectTrigger className="w-[160px] bg-zinc-900/50 border-zinc-800 text-zinc-100">
          <SelectValue placeholder="All Sectors" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-800">
          <SelectItem value="all" className="text-zinc-100">All Sectors</SelectItem>
          {sectors.map(sector => (
            <SelectItem key={sector} value={sector} className="text-zinc-100">
              {sector}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedRecommendation} onValueChange={onRecommendationChange}>
        <SelectTrigger className="w-[160px] bg-zinc-900/50 border-zinc-800 text-zinc-100">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent className="bg-zinc-900 border-zinc-800">
          <SelectItem value="all" className="text-zinc-100">All Types</SelectItem>
          <SelectItem value="BUY" className="text-emerald-400">BUY</SelectItem>
          <SelectItem value="HOLD" className="text-amber-400">HOLD</SelectItem>
          <SelectItem value="SELL" className="text-rose-400">SELL</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
