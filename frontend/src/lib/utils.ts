import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  })
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(d)
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    LOW: 'text-success-600 bg-success-100',
    MEDIUM: 'text-warning-600 bg-warning-100',
    HIGH: 'text-warning-600 bg-warning-100',
    CRITICAL: 'text-danger-600 bg-danger-100',
    INFO: 'text-primary-600 bg-primary-100',
    WATCH: 'text-warning-600 bg-warning-100',
    WARNING: 'text-danger-600 bg-danger-100',
    EMERGENCY: 'text-danger-600 bg-danger-100',
  }
  return colors[severity] || 'text-gray-600 bg-gray-100'
}

export function getHazardIcon(hazardType: string): string {
  const icons: Record<string, string> = {
    EARTHQUAKE: '🌍',
    FLOOD: '🌊',
    HURRICANE: '🌀',
    TORNADO: '🌪️',
    WILDFIRE: '🔥',
    TSUNAMI: '🌊',
    VOLCANO: '🌋',
    LANDSLIDE: '🏔️',
    WINTER_STORM: '❄️',
    HEAT_WAVE: '☀️',
    DROUGHT: '🏜️',
  }
  return icons[hazardType] || '⚠️'
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}