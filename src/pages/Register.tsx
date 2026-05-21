import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register, oauthLogin, ApiError, checkOAuthConfig } from '../api'
import { useToast } from '../components/Toast'
import { UserPlus, Star } from 'lucide-react'

export default function Register({ setAuth }: { setAuth: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthEnabled, setOAuthEnabled] = useState(false)
  const [checkingOAuth, setCheckingOAuth] = useState(true)
  const navigate = useNavigate()
  const { showToast } = useToast()

  useEffect(() => {
    checkOAuthConfig()
      .then(config => setOAuthEnabled(config.enabled))
      .catch(() => setOAuthEnabled(false))
      .finally(() => setCheckingOAuth(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await register(username, password)
      localStorage.setItem('token', res.token)
      localStorage.setItem('username', res.username)
      if (res.organizationId) {
        localStorage.setItem('organizationId', String(res.organizationId))
      }
      showToast(`Account created! Welcome, ${res.username}!`, 'success')
      setAuth()
      navigate('/')
    } catch (err) {
      const error = err as ApiError
      showToast(error.message || 'Registration failed. Username might be taken.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = (provider: 'google' | 'github') => {
    if (!oauthEnabled) {
      showToast(`${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend.`, 'warning')
      return
    }
    oauthLogin(provider)
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      {/* Decorative Elements */}
      <Star className="fixed top-20 right-20 w-20 h-20 text-neo-muted animate-spin-slow opacity-20" strokeWidth={1} />
      <div className="fixed bottom-1/4 left-10 w-12 h-12 bg-neo-accent border-4 border-black -rotate-6 animate-float" />

      <div className="w-full max-w-md">
        {/* Logo Block */}
        <div className="bg-neo-secondary border-4 border-black p-6 mb-8 shadow-neo-lg -rotate-2">
          <h1 className="text-4xl font-black tracking-tighter uppercase">Task<br />Brutalist</h1>
        </div>

        {/* Register Form */}
        <div className="bg-white border-4 border-black p-8 shadow-neo-xl">
          <div className="mb-6">
            <h2 className="text-3xl font-black uppercase tracking-tight flex items-center gap-2">
              <UserPlus className="w-8 h-8" />
              Register
            </h2>
            <p className="text-sm font-bold text-black/60 mt-2 uppercase tracking-wide">Create your account</p>
          </div>

          {/* OAuth Status Badge */}
          {!checkingOAuth && oauthEnabled && (
            <div className="bg-green-300 border-4 border-black p-2 mb-4 font-bold text-xs uppercase flex items-center gap-2">
              <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
              OAuth Ready
            </div>
          )}

          {/* OAuth Buttons */}
          {(!checkingOAuth && oauthEnabled) && (
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleOAuth('google')}
                className="w-full btn btn-outline flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </button>
              <button
                onClick={() => handleOAuth('github')}
                className="w-full btn btn-outline flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Sign up with GitHub
              </button>
            </div>
          )}

          {/* OAuth Not Configured Warning */}
          {!checkingOAuth && !oauthEnabled && (
            <div className="bg-yellow-300 border-4 border-black p-3 mb-6 text-xs">
              <p className="font-bold uppercase mb-1">OAuth Not Available</p>
              <p className="font-medium">Set GOOGLE_CLIENT_ID and GITHUB_CLIENT_ID in backend .env</p>
            </div>
          )}

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-4 border-black"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white font-bold uppercase tracking-wider">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-bold uppercase text-sm tracking-widest mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                placeholder="john_doe"
                minLength={3}
                maxLength={50}
                required
              />
              <p className="text-xs font-bold text-black/50 mt-1">3-50 characters</p>
            </div>

            <div>
              <label className="block font-bold uppercase text-sm tracking-widest mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-secondary w-full"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t-4 border-black">
            <p className="font-bold text-center">
              Have account?{' '}
              <Link to="/login" className="text-neo-accent font-black uppercase underline underline-offset-4">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}