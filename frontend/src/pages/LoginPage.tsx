import React, { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, User as UserIcon, Shield, Radio, Sparkles } from 'lucide-react'

export function LoginPage() {
  const { login, register } = useAuthStore()
  const [isSignUp, setIsSignUp] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('ANALYST')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          setError('Please enter your full name')
          setLoading(false)
          return
        }
        await register(email, password, fullName, role)
      } else {
        await login(email, password)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || `${isSignUp ? 'Registration' : 'Login'} failed. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070b14] text-slate-100 px-4 py-8 relative overflow-hidden">
      {/* Background ambient glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-3d border border-cyan-400/30">
            <span className="text-white text-3xl font-extrabold tracking-wider">R</span>
          </div>
          <h1 className="text-3xl font-black tracking-wide text-slate-100 flex items-center justify-center gap-2">
            Resque<span className="text-cyan-400">.AI</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Disaster Management & Hazard Prediction Platform</p>
        </div>

        <Card className="card-3d border-slate-800/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center border-b border-slate-800/60 pb-4">
            <CardTitle className="text-xl font-bold text-slate-100">
              {isSignUp ? 'Create your account' : 'Sign in to your account'}
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              {isSignUp ? 'Get instant access to real-time hazard analytics' : 'Enter your credentials to access the 3D command dashboard'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs shadow-inner">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {isSignUp && (
                <div>
                  <label htmlFor="fullName" className="label text-xs font-semibold text-slate-300">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input pl-10 text-xs"
                      placeholder="Jane Doe"
                      required={isSignUp}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="label text-xs font-semibold text-slate-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10 text-xs"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="label text-xs font-semibold text-slate-300">Password</label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10 pr-10 text-xs"
                    placeholder="••••••••"
                    required
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div>
                  <label htmlFor="role" className="label text-xs font-semibold text-slate-300">Organization Role</label>
                  <div className="relative">
                    <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="input pl-10 text-xs bg-slate-900 border-slate-700/80 text-slate-200"
                      disabled={loading}
                    >
                      <option value="ANALYST">Data Analyst</option>
                      <option value="FIRST_RESPONDER">First Responder</option>
                      <option value="EMERGENCY_MANAGER">Emergency Manager</option>
                      <option value="PUBLIC">Public Safety Officer</option>
                    </select>
                  </div>
                </div>
              )}

              {!isSignUp && (
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-cyan-500" />
                    <span>Remember me</span>
                  </label>
                  <a href="#" className="text-cyan-400 hover:text-cyan-300 font-medium">Forgot password?</a>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-sm font-bold shadow-neon-cyan mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
                    {isSignUp ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs">
              <p className="text-slate-400">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-cyan-400 hover:text-cyan-300 font-bold underline underline-offset-2 ml-1"
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </p>
            </div>
          </CardContent>

          {!isSignUp && (
            <CardFooter className="border-t border-slate-800/80 pt-4">
              <div className="space-y-2 text-xs text-center w-full">
                <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Demo Login Credentials:</p>
                <div className="bg-slate-950/80 rounded-xl p-3 font-mono text-[11px] text-cyan-300 space-y-1 border border-slate-800">
                  <div>Email: demo@resque.ai</div>
                  <div>Password: demo123456</div>
                </div>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  )
}