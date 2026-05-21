import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { joinOrganization } from '../api'
import { Building2, CheckCircle, XCircle, Loader, ArrowRight } from 'lucide-react'

export default function JoinOrganization() {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [orgName, setOrgName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    handleJoin()
  }, [inviteCode])

  const handleJoin = async () => {
    if (!inviteCode) {
      setStatus('error')
      setErrorMsg('Invalid invite link')
      return
    }

    try {
      const org = await joinOrganization(inviteCode)
      setOrgName(org.name)
      setStatus('success')

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        navigate('/')
      }, 3000)
    } catch (err) {
      setErrorMsg('Failed to join workspace. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      <div className="w-full max-w-md">
        <div className="bg-white border-4 border-black p-8 shadow-neo-xl">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-6">
                <Loader className="w-12 h-12 animate-spin text-neo-accent" />
              </div>
              <h2 className="text-2xl font-black uppercase text-center">Joining Workspace</h2>
              <p className="text-center font-bold text-black/60 mt-2">Please wait...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="bg-green-500 border-4 border-black p-4">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-black uppercase text-center text-green-600">Welcome!</h2>
              <p className="text-center font-bold mt-2">
                You've joined <span className="text-neo-accent">{orgName}</span>
              </p>
              <p className="text-center text-sm font-bold text-black/60 mt-4">
                Redirecting in 3 seconds...
              </p>
              <button onClick={() => navigate('/')} className="btn btn-primary w-full mt-6 flex items-center justify-center gap-2">
                Go to Dashboard
                <ArrowRight className="w-5 h-5" />
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="bg-neo-accent border-4 border-black p-4">
                  <XCircle className="w-12 h-12 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-black uppercase text-center text-neo-accent">Failed to Join</h2>
              <p className="text-center font-bold mt-2 text-black/60">{errorMsg}</p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => navigate('/select-org')} className="btn btn-outline flex-1">
                  Select Workspace
                </button>
                <button onClick={() => navigate('/')} className="btn btn-primary flex-1 flex items-center justify-center gap-2">
                  Dashboard <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 bg-black text-white border-4 border-black p-4 shadow-neo-md flex items-center gap-3">
          <Building2 className="w-6 h-6" />
          <span className="font-bold">TaskBrutalist</span>
        </div>
      </div>
    </div>
  )
}
