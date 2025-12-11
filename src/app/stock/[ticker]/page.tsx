import { StockDetailClient } from '@/components/StockAnalysis/StockDetailClient'

type Props = {
  params: Promise<{ ticker: string }>
}

export default async function StockDetailPage({ params }: Props) {
  const { ticker } = await params
  return <StockDetailClient ticker={ticker} />
}
