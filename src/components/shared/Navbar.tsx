'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { TrendingUp, BarChart3, History, Wallet } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: BarChart3 },
  { href: '/predictions', label: 'Predictions', icon: History },
  { href: '/paper-trading', label: 'Paper Trading', icon: Wallet },
]

export function Navbar() {
  const pathname = usePathname()
  
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-100">
            Apex<span className="text-amber-500">Signals</span>
          </span>
        </Link>
        
        <nav className="flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive 
                    ? 'bg-zinc-800 text-zinc-100' 
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}