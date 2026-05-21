import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrganizations, getAvailableOrganizations, createOrganization, joinRequest, Organization } from '../api'
import { Building2, Plus, ChevronRight, LogIn, User, Search, X } from 'lucide-react'

export default function OrganizationSelector() {
  const navigate = useNavigate()
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [joinSearch, setJoinSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinMessage, setJoinMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [limitMessage, setLimitMessage] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const MAX_ORGS = 5

  useEffect(() => {
    loadOrgs()
  }, [])

  // Load available organizations when joining
  useEffect(() => {
    if (showJoin) {
      loadAvailableOrgs()
    }
  }, [showJoin])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadOrgs = async () => {
    try {
      const data = await getOrganizations()
      setOrgs(data)
    } catch (err) {
      console.error('Failed to load organizations:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableOrgs = async () => {
    try {
      const data = await getAvailableOrganizations()
      setAvailableOrgs(data)
    } catch (err) {
      console.error('Failed to load available organizations:', err)
    }
  }

  const handleSelect = (org: Organization) => {
    console.log('Selecting org:', org)
    // Directly set all values in localStorage
    localStorage.setItem('organizationId', String(org.id))
    localStorage.setItem('organizationName', org.name)
    localStorage.setItem('userRole', org.role)
    localStorage.removeItem('personalMode')
    window.dispatchEvent(new Event('org-change'))
    window.dispatchEvent(new Event('personal-mode-change'))

    // Navigate to dashboard - App will read from localStorage
    navigate('/', { replace: true })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName.trim()) return

    setCreating(true)
    try {
      const slug = newOrgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const org = await createOrganization(newOrgName, slug)
      localStorage.setItem('organizationId', String(org.id))
      localStorage.setItem('organizationName', org.name)
      localStorage.setItem('userRole', org.role)
      localStorage.removeItem('personalMode')
      window.dispatchEvent(new Event('org-change'))
      window.dispatchEvent(new Event('personal-mode-change'))
      navigate('/', { replace: true })
    } catch (err: any) {
      console.error('Failed to create organization:', err)
      setJoinMessage({ type: 'error', text: err.message || 'Failed to create workspace' })
    } finally {
      setCreating(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOrg && !joinSearch.trim()) return

    const orgSlug = selectedOrg?.slug || joinSearch.trim()
    setJoining(true)
    setJoinMessage(null)
    try {
      await joinRequest(orgSlug)
      setJoinMessage({ type: 'success', text: 'Join request submitted! You will be notified when approved.' })
      setShowJoin(false)
      setSelectedOrg(null)
      setJoinSearch('')
    } catch (err: any) {
      setJoinMessage({ type: 'error', text: err.message || 'Failed to submit join request' })
    } finally {
      setJoining(false)
    }
  }

  const handleSkip = () => {
    localStorage.removeItem('organizationId')
    localStorage.removeItem('organizationName')
    localStorage.removeItem('userRole')
    localStorage.setItem('personalMode', 'true')
    window.dispatchEvent(new Event('org-change'))
    window.dispatchEvent(new Event('personal-mode-change'))
    navigate('/', { replace: true })
  }

  // Filter organizations for dropdown (available orgs to join)
  const filteredOrgs = availableOrgs.filter(org =>
    org.name.toLowerCase().includes(joinSearch.toLowerCase()) ||
    org.slug.toLowerCase().includes(joinSearch.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        <div className="text-4xl font-black animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="bg-black text-white border-4 border-black p-6 mb-8 shadow-neo-lg">
          <h1 className="text-4xl font-black uppercase tracking-tight">
            {orgs.length === 0 ? 'Welcome!' : 'Select Workspace'}
          </h1>
          <p className="text-white/60 font-bold mt-2 uppercase tracking-widest">
            {orgs.length === 0 ? 'Create a workspace or use personal mode' : 'Choose an organization or create new'}
          </p>
        </div>

        {/* Organization List */}
        {orgs.length > 0 && (
          <div className="space-y-4 mb-8">
            {orgs.map(org => (
              <button
                key={org.id}
                onClick={() => handleSelect(org)}
                className="w-full card flex items-center justify-between group hover:bg-neo-secondary transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-neo-accent border-4 border-black p-3">
                    <Building2 className="w-8 h-8 text-white" strokeWidth={3} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black">{org.name}</h3>
                    <span className="badge badge-muted mt-1">{org.role}</span>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
            ))}
          </div>
        )}

        {/* Skip - Use Personal Mode (when no orgs) */}
        {orgs.length === 0 && (
          <div className="space-y-4 mb-8">
            <button
              onClick={handleSkip}
              className="w-full card flex items-center justify-between group hover:bg-neo-secondary transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="bg-gray-500 border-4 border-black p-3">
                  <User className="w-8 h-8 text-white" strokeWidth={3} />
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-black">Personal Mode</h3>
                  <span className="text-sm text-gray-600">Manage your own tasks</span>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}

        {/* Join Existing */}
        {showJoin ? (
          <div className="card mb-4">
            <h3 className="text-xl font-black mb-4 uppercase">Join Workspace</h3>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block font-bold uppercase text-sm tracking-widest mb-2">
                  Search Workspace
                </label>
                <div className="relative" ref={dropdownRef}>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={selectedOrg ? selectedOrg.name : joinSearch}
                        onChange={(e) => { setSelectedOrg(null); setJoinSearch(e.target.value); setShowDropdown(true) }}
                        onFocus={() => setShowDropdown(true)}
                        className="input pl-10"
                        placeholder="Search by name or slug..."
                      />
                    </div>
                    {selectedOrg && (
                      <button type="button" onClick={() => { setSelectedOrg(null); setJoinSearch('') }} className="p-2 hover:bg-gray-200">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {/* Dropdown */}
                  {showDropdown && joinSearch && !selectedOrg && (
                    <div className="absolute z-10 w-full mt-1 bg-white border-4 border-black max-h-60 overflow-y-auto">
                      {filteredOrgs.length === 0 ? (
                        <div className="p-3 text-gray-500 font-bold">No workspaces found</div>
                      ) : (
                        filteredOrgs.map(org => (
                          <button
                            key={org.id}
                            type="button"
                            onClick={() => { setSelectedOrg(org); setJoinSearch(org.slug); setShowDropdown(false) }}
                            className="w-full p-3 text-left hover:bg-gray-100 border-b-2 border-gray-200"
                          >
                            <div className="font-black">{org.name}</div>
                            <div className="text-sm text-gray-500">@{org.slug}</div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              {joinMessage && (
                <div className={`p-3 border-4 border-black font-bold ${joinMessage.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                  {joinMessage.text}
                </div>
              )}
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary flex-1" disabled={joining || (!selectedOrg && !joinSearch.trim())}>
                  {joining ? 'Sending...' : 'Request to Join'}
                </button>
                <button type="button" onClick={() => { setShowJoin(false); setJoinMessage(null); setSelectedOrg(null); setJoinSearch('') }} className="btn btn-outline">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            onClick={() => {
              if (orgs.length >= MAX_ORGS) {
                setLimitMessage(`You can only join up to ${MAX_ORGS} workspaces`)
                return
              }
              setLimitMessage(null)
              setShowJoin(true)
            }}
            className="w-full btn btn-outline mb-4 flex items-center justify-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Join Existing Workspace
          </button>
        )}

        {/* Create New */}
        {showCreate ? (
          <div className="card">
            <h3 className="text-xl font-black mb-4 uppercase">Create Workspace</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block font-bold uppercase text-sm tracking-widest mb-2">Workspace Name</label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="input"
                  placeholder="My Team"
                  required
                />
              </div>
              {joinMessage && (
                <div className={`p-3 border-4 border-black font-bold ${joinMessage.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                  {joinMessage.text}
                </div>
              )}
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary flex-1" disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
                <button type="button" onClick={() => { setShowCreate(false); setJoinMessage(null) }} className="btn btn-outline">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button
            onClick={() => {
              if (orgs.length >= MAX_ORGS) {
                setLimitMessage(`You can only have up to ${MAX_ORGS} workspaces`)
                return
              }
              setLimitMessage(null)
              setShowCreate(true)
            }}
            className="w-full btn btn-secondary flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create New Workspace
          </button>
        )}

        {/* Limit Warning */}
        {limitMessage && (
          <div className="bg-red-500 text-white border-4 border-black p-3 font-bold mt-4">
            {limitMessage}
          </div>
        )}
      </div>
    </div>
  )
}
