import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { User, Bell, Key, Shield, Palette, Save, Loader2, Settings as SettingsIcon } from 'lucide-react'

export function SettingsPage() {
  const { user, logout } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'api' | 'appearance' | 'security'>('profile')
  const [saving, setSaving] = useState(false)

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'appearance', label: 'Appearance & Maps', icon: Palette },
    { id: 'security', label: 'Security', icon: Shield },
  ]

  const handleSave = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-cyan-400" />
          System Settings & Control
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">Configure your operator profile, alert thresholds & API access keys</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="lg:w-64 flex-shrink-0 sticky top-24 h-fit p-2 border-slate-800 bg-slate-900/90">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all',
                    isActive
                      ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 shadow-neon-cyan'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  )}
                >
                  <Icon className={cn('w-4 h-4', isActive ? 'text-cyan-400' : 'text-slate-500')} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </Card>

        <div className="flex-1">
          {activeTab === 'profile' && (
            <Card className="border-slate-800 bg-slate-900/90">
              <CardHeader>
                <CardTitle>Operator Profile</CardTitle>
                <CardDescription>Update your operator credentials</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-xs">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-slate-950 border border-cyan-500/40 rounded-2xl flex items-center justify-center text-2xl font-bold text-cyan-400 shadow-neon-cyan">
                    {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'O'}
                  </div>
                  <div>
                    <button className="btn-secondary text-xs">Upload New Avatar</button>
                    <p className="text-slate-400 mt-1">PNG or JPG under 2MB</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label text-xs">Operator Name</label>
                    <input type="text" defaultValue={user?.full_name || ''} className="input text-xs" />
                  </div>
                  <div>
                    <label className="label text-xs">Email Address</label>
                    <input type="email" defaultValue={user?.email || ''} className="input text-xs" disabled />
                  </div>
                  <div>
                    <label className="label text-xs">Access Role</label>
                    <input type="text" defaultValue={user?.role || 'ANALYST'} className="input text-xs" disabled />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-2.5">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                  Save Profile
                </button>
              </CardFooter>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card className="border-slate-800 bg-slate-900/90">
              <CardHeader>
                <CardTitle>Telemetry & Alert Routing</CardTitle>
                <CardDescription>Configure emergency broadcast channels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-xs">
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-200">Alert Channels</h4>
                  {[
                    { id: 'email', label: 'Email Broadcasts', description: 'Urgent hazard summaries sent to email', defaultChecked: true },
                    { id: 'push', label: 'Web Push Notifications', description: 'Real-time browser notifications', defaultChecked: true },
                    { id: 'sms', label: 'SMS SOS Alerts', description: 'Direct SMS dispatches for critical emergencies', defaultChecked: true },
                  ].map((channel) => (
                    <label key={channel.id} className="flex items-center justify-between p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" defaultChecked={channel.defaultChecked} className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500" />
                        <div>
                          <p className="font-bold text-slate-200">{channel.label}</p>
                          <p className="text-slate-400">{channel.description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-2.5">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                  Save Notification Rules
                </button>
              </CardFooter>
            </Card>
          )}

          {activeTab === 'api' && (
            <Card className="border-slate-800 bg-slate-900/90">
              <CardHeader>
                <CardTitle>API Access Tokens</CardTitle>
                <CardDescription>Manage keys for programmatic data ingestion</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-100">Production Key</p>
                      <p className="text-slate-400">Created 2026 • Active</p>
                    </div>
                    <button className="btn-secondary text-xs">Copy Key</button>
                  </div>
                  <div className="mt-2.5">
                    <code className="block bg-slate-900 p-2 rounded border border-slate-800 text-cyan-300 font-mono">rsk_demo_key_123</code>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'appearance' && (
            <Card className="border-slate-800 bg-slate-900/90">
              <CardHeader>
                <CardTitle>3D Map & Interface Theme</CardTitle>
                <CardDescription>Default spatial map settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div>
                  <label className="label text-xs">Primary Interface Theme</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl border border-cyan-500/50 bg-slate-950 text-cyan-300 font-bold text-center">
                      High-Tech 3D Dark Mode (Active)
                    </div>
                    <div className="p-3 rounded-xl border border-slate-800 bg-slate-900 text-slate-500 text-center cursor-not-allowed">
                      Light Mode (Deprecated)
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card className="border-slate-800 bg-slate-900/90">
              <CardHeader>
                <CardTitle>Security Controls</CardTitle>
                <CardDescription>Account authentication security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-200">Two-Factor Authentication</p>
                    <p className="text-slate-400">Secure operator logins with TOTP</p>
                  </div>
                  <button className="btn-primary text-xs">Enable 2FA</button>
                </div>
                <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-rose-300">Logout Everywhere</p>
                    <p className="text-rose-400/80">Revoke all active session tokens</p>
                  </div>
                  <button onClick={logout} className="btn-danger text-xs">Sign Out</button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}