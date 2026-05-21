import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOrganization, getMembers, createInvite, updateMemberRole, removeMember, getJoinRequests, approveJoinRequest, rejectJoinRequest } from '../api'
import { Building2, Copy, Check, Crown, Shield, User, Eye, ArrowLeft, Trash2, Loader, UserPlus, X, CheckCircle } from 'lucide-react'

interface Member {
  id: number
  userId: number
  username: string
  role: string
  joinedAt: string
}

interface JoinRequestData {
  id: number
  user: { id: number; username: string }
  organization: { id: number }
  status: string
  createdAt: string
}

const roleConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  OWNER: { label: 'Owner', icon: <Crown className="w-4 h-4" />, color: 'bg-yellow-400' },
  ADMIN: { label: 'Admin', icon: <Shield className="w-4 h-4" />, color: 'bg-red-500' },
  MEMBER: { label: 'Member', icon: <User className="w-4 h-4" />, color: 'bg-blue-500' },
  VIEWER: { label: 'Viewer', icon: <Eye className="w-4 h-4" />, color: 'bg-gray-400' },
}

const roleHierarchy = ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER']

export default function OrganizationSettings() {
  const navigate = useNavigate()
  const [userRole, setUserRole] = useState<string | null>(null)

  // Sync userRole from localStorage - runs on mount and whenever org changes
  useEffect(() => {
    const syncRole = () => {
      const storedRole = localStorage.getItem('userRole')
      console.log('SyncRole: localStorage userRole =', storedRole)
      setUserRole(storedRole)
    }
    syncRole()
    window.addEventListener('org-change', syncRole)
    return () => window.removeEventListener('org-change', syncRole)
  }, [])

  const [org, setOrg] = useState<{ id: number; name: string; slug: string; ownerId: number } | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [editingMember, setEditingMember] = useState<number | null>(null)
  const [removingMember, setRemovingMember] = useState<number | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [joinRequests, setJoinRequests] = useState<JoinRequestData[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [processingRequest, setProcessingRequest] = useState<number | null>(null)
  const [requestsError, setRequestsError] = useState<string | null>(null)

  const canManage = userRole === 'OWNER' || userRole === 'ADMIN'

  useEffect(() => {
    // Ensure we have orgId from localStorage
    const storedOrgId = localStorage.getItem('organizationId')
    if (!storedOrgId) {
      navigate('/select-org')
      return
    }
    loadData()

    // Listen for org changes
    const handleOrgChange = () => {
      const newOrgId = localStorage.getItem('organizationId')
      if (newOrgId) {
        loadData()
      }
    }
    window.addEventListener('org-change', handleOrgChange)
    return () => window.removeEventListener('org-change', handleOrgChange)
  }, [])

  const loadData = async () => {
    const currentOrgId = localStorage.getItem('organizationId')
    if (!currentOrgId) return

    try {
      const [orgData, membersData] = await Promise.all([
        getOrganization(Number(currentOrgId)),
        getMembers(Number(currentOrgId)),
      ])
      setOrg(orgData)
      setMembers(membersData)
    } catch (err) {
      console.error('Failed to load organization data:', err)
    } finally {
      setLoading(false)
    }
    // Always load join requests separately
    await loadJoinRequests()
  }

  const loadJoinRequests = async () => {
    const currentOrgId = localStorage.getItem('organizationId')
    if (!currentOrgId) return

    setLoadingRequests(true)
    setRequestsError(null)
    try {
      console.log('Fetching join requests for orgId:', currentOrgId, 'as userRole:', userRole)
      const requests = await getJoinRequests(Number(currentOrgId))
      console.log('Join requests response:', requests, 'length:', requests?.length)
      setJoinRequests(Array.isArray(requests) ? requests : [])
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load join requests'
      console.error('Failed to load join requests:', errorMsg, err)
      setRequestsError(errorMsg)
      setJoinRequests([])
    } finally {
      setLoadingRequests(false)
    }
  }

  const handleApproveRequest = async (requestId: number) => {
    const currentOrgId = localStorage.getItem('organizationId')
    if (!currentOrgId) return

    setProcessingRequest(requestId)
    try {
      await approveJoinRequest(Number(currentOrgId), requestId)
      setJoinRequests(prev => prev.filter(r => r.id !== requestId))
    } catch (err) {
      console.error('Failed to approve request:', err)
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleRejectRequest = async (requestId: number) => {
    const currentOrgId = localStorage.getItem('organizationId')
    if (!currentOrgId) return

    setProcessingRequest(requestId)
    try {
      await rejectJoinRequest(Number(currentOrgId), requestId)
      setJoinRequests(prev => prev.filter(r => r.id !== requestId))
    } catch (err) {
      console.error('Failed to reject request:', err)
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleGenerateInvite = async () => {
    const currentOrgId = localStorage.getItem('organizationId')
    if (!currentOrgId) return

    setGeneratingLink(true)
    try {
      const invite = await createInvite(Number(currentOrgId))
      const link = `${window.location.origin}/join/${invite.inviteCode}`
      setInviteLink(link)
      setShowInviteForm(false)
    } catch (err) {
      console.error('Failed to generate invite:', err)
    } finally {
      setGeneratingLink(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleRoleChange = async (memberId: number, newRole: string) => {
    const currentOrgId = localStorage.getItem('organizationId')
    if (!currentOrgId || memberId === org?.ownerId) return

    setEditingMember(memberId)
    try {
      await updateMemberRole(Number(currentOrgId), members.find(m => m.id === memberId)!.userId, newRole)
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    } catch (err) {
      console.error('Failed to update role:', err)
    } finally {
      setEditingMember(null)
    }
  }

  const handleRemoveMember = async (member: Member) => {
    const currentOrgId = localStorage.getItem('organizationId')
    if (!currentOrgId || member.userId === org?.ownerId) return
    if (!confirm(`Remove ${member.username} from workspace?`)) return

    setRemovingMember(member.id)
    try {
      await removeMember(Number(currentOrgId), member.userId)
      setMembers(prev => prev.filter(m => m.id !== member.id))
    } catch (err) {
      console.error('Failed to remove member:', err)
    } finally {
      setRemovingMember(null)
    }
  }

  const getRoleIndex = (role: string) => roleHierarchy.indexOf(role)
  const currentUserRoleIndex = getRoleIndex(userRole || 'VIEWER')

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-neo-accent" />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="card p-8 text-center">
          <p className="font-bold">Organization not found</p>
          <button onClick={() => navigate('/select-org')} className="btn btn-primary mt-4">
            Select Workspace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/')} className="btn btn-outline p-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="bg-black text-white border-4 border-black p-4 flex-1 shadow-neo-lg">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-black uppercase">{org.name}</h1>
                <span className="badge badge-muted mt-1">/{org.slug}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Invite Section */}
          <div className="card">
            <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-neo-accent" />
              Invite Members
            </h2>

            {inviteLink ? (
              <div className="space-y-3">
                <div className="bg-black/5 p-3 border-4 border-black font-mono text-sm break-all">
                  {inviteLink}
                </div>
                <button onClick={handleCopyLink} className="btn btn-primary w-full flex items-center justify-center gap-2">
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            ) : showInviteForm ? (
              <button onClick={handleGenerateInvite} disabled={generatingLink} className="btn btn-primary w-full">
                {generatingLink ? 'Generating...' : 'Generate Invite Link'}
              </button>
            ) : (
              <button onClick={() => setShowInviteForm(true)} className="btn btn-secondary w-full">
                <Copy className="w-5 h-5 mr-2" />
                Generate Invite Link
              </button>
            )}
          </div>

          {/* Members List */}
          <div className="card md:col-span-2">
            <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-neo-accent" />
              Team Members ({members.length})
            </h2>

            <div className="space-y-3">
              {members.map(member => {
                const roleInfo = roleConfig[member.role] || roleConfig.MEMBER
                const isOwner = member.userId === org.ownerId
                const isCurrentUser = member.username === localStorage.getItem('username')

                return (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-black/5 border-4 border-black hover:bg-black/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${roleInfo.color} border-4 border-black flex items-center justify-center text-white`}>
                        {roleInfo.icon}
                      </div>
                      <div>
                        <p className="font-black">
                          {member.username}
                          {isCurrentUser && <span className="text-neo-accent ml-2">(you)</span>}
                        </p>
                        <p className="text-xs font-bold text-black/50 uppercase">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwner ? (
                        <span className={`${roleInfo.color} text-white font-bold px-3 py-1 text-sm uppercase flex items-center gap-1`}>
                          {roleInfo.icon}
                          {roleInfo.label}
                        </span>
                      ) : canManage ? (
                        editingMember === member.id ? (
                          <Loader className="w-5 h-5 animate-spin" />
                        ) : (
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            className="input py-1 px-2 text-sm font-bold"
                            disabled={getRoleIndex(member.role) >= currentUserRoleIndex}
                          >
                            {roleHierarchy.map(role => {
                              const disabled = getRoleIndex(role) >= currentUserRoleIndex
                              return (
                                <option key={role} value={role} disabled={disabled}>
                                  {roleConfig[role]?.label || role}
                                </option>
                              )
                            })}
                          </select>
                        )
                      ) : (
                        <span className={`${roleInfo.color} text-white font-bold px-3 py-1 text-sm uppercase flex items-center gap-1`}>
                          {roleInfo.icon}
                          {roleInfo.label}
                        </span>
                      )}

                      {canManage && !isOwner && (
                        <button
                          onClick={() => handleRemoveMember(member)}
                          disabled={removingMember === member.id}
                          className="btn btn-outline p-2 text-red-600 hover:bg-red-50"
                        >
                          {removingMember === member.id ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Join Requests Section - Only for Admins/Owners */}
          {canManage && (
            <div className="card md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black uppercase flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-neo-accent" />
                  Join Requests
                </h2>
                {joinRequests.length > 0 && (
                  <span className="badge bg-yellow-400">{joinRequests.length} pending</span>
                )}
              </div>

              {loadingRequests ? (
                <div className="flex justify-center py-8">
                  <Loader className="w-6 h-6 animate-spin text-neo-accent" />
                </div>
              ) : requestsError ? (
                <div className="p-4 bg-red-100 border-4 border-red-500 text-red-700 font-bold">
                  Error: {requestsError}
                </div>
              ) : joinRequests.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                  <p className="font-bold text-green-600">All caught up!</p>
                  <p className="text-sm text-gray-500">No pending join requests</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {joinRequests.map(request => (
                    <div key={request.id} className="flex items-center justify-between p-4 bg-white border-4 border-black hover:shadow-neo-sm transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-neo-accent border-4 border-black flex items-center justify-center text-white font-black text-xl">
                          {request.user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-lg">{request.user.username}</p>
                          <p className="text-xs font-bold text-black/50 uppercase tracking-wide">
                            Requested {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleApproveRequest(request.id)}
                          disabled={processingRequest === request.id}
                          className="btn btn-primary flex items-center gap-2"
                        >
                          {processingRequest === request.id ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request.id)}
                          disabled={processingRequest === request.id}
                          className="btn btn-outline border-red-500 text-red-500 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
