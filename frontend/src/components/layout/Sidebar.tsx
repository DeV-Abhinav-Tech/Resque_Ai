import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Map, Bell, History, Settings, ChevronLeft, ChevronRight, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Hazard Map', href: '/map', icon: Map },
  { name: 'Alerts', href: '/alerts', icon: Bell },
  { name: 'Historical', href: '/historical', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'bg-white border-r border-slate-200 transition-all duration-300 flex-shrink-0 z-30 shadow-sm',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex flex-col h-full">
        {/* Navigation list */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            const Icon = item.icon
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative',
                  isActive
                    ? 'bg-orange-50 text-orange-800 border border-orange-200 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent',
                  collapsed && 'justify-center px-0'
                )}
                title={collapsed ? item.name : undefined}
                aria-label={item.name}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110", isActive ? "text-orange-600" : "text-slate-500")} aria-hidden="true" />
                {!collapsed && <span>{item.name}</span>}
                {isActive && !collapsed && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Indian Agencies Telemetry Status Footer */}
        {!collapsed && (
          <div className="px-4 py-3 mx-3 mb-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1 font-mono">
            <div className="flex items-center justify-between text-slate-800 font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
                IMD / NDMA Active
              </span>
              <span className="text-[10px] text-orange-700 font-bold">Bharat v0.1</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">IMD • NDRF • INCOIS • ISRO Bhuvan</p>
          </div>
        )}

        {/* Collapse Toggle */}
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200',
              collapsed && 'justify-center'
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}