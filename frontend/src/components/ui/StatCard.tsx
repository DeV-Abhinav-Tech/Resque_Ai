import React from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ReactNode
  trend?: { value: string; label: string }
  trendUp?: boolean
  subtitle?: string
  className?: string
}

export function StatCard({ title, value, icon, trend, trendUp = true, subtitle, className }: StatCardProps) {
  return (
    <div className={cn('card-3d p-6 relative group overflow-hidden bg-white border-slate-200/80', className)}>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 opacity-60 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="text-3xl font-black text-slate-900 mt-1.5 font-mono tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-cyan-600 shadow-sm group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs font-medium">
          <span className={cn(
            'px-2 py-0.5 rounded-full border font-bold',
            trendUp ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
          )}>
            {trendUp ? '↑' : '↓'} {trend.value}
          </span>
          <span className="text-slate-500">{trend.label}</span>
        </div>
      )}
    </div>
  )
}