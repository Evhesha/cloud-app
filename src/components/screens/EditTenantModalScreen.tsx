import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Cookies from 'js-cookie'
import { TenantForm } from './TenantForm'
import { defaultQuotas, validateEmails, type User } from './tenantManagement'

type TenantSummary = {
  id: number
  quota_id: number
}

export function EditTenantModalScreen() {
  const navigate = useNavigate()
  const { tenantId } = useParams<{ tenantId: string }>()
  const parsedTenantId = Number(tenantId)

  const [userEmails, setUserEmails] = useState<string>('')
  const [selectedQuotaId, setSelectedQuotaId] = useState<number>(1)
  const [submitting, setSubmitting] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [foundUsers, setFoundUsers] = useState<User[]>([])
  const [existingUsers, setExistingUsers] = useState<User[]>([])

  useEffect(() => {
    const loadTenant = async () => {
      if (!Number.isFinite(parsedTenantId)) {
        setError('Invalid tenant id.')
        return
      }

      try {
        setInitialLoading(true)
        setError(null)
        const token = Cookies.get('token')

        const [tenantsResponse, usersResponse] = await Promise.all([
          fetch('http://localhost:3000/tenants', {
            method: 'GET',
            credentials: 'include',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`http://localhost:3000/tenants/${parsedTenantId}/users`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
        ])

        if (!tenantsResponse.ok) {
          throw new Error('Failed to load tenants.')
        }
        if (!usersResponse.ok) {
          throw new Error('Failed to load tenant users.')
        }

        const tenants: TenantSummary[] = await tenantsResponse.json()
        const tenant = tenants.find((item) => item.id === parsedTenantId)

        if (!tenant) {
          throw new Error('Tenant not found.')
        }

        const users: User[] = await usersResponse.json()
        setSelectedQuotaId(tenant.quota_id)
        setExistingUsers(users)
        setFoundUsers(users)
        setUserEmails(users.map((user) => user.email).join(', '))
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load tenant data.')
      } finally {
        setInitialLoading(false)
      }
    }

    void loadTenant()
  }, [parsedTenantId])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!userEmails.trim()) {
      setError('At least one user email is required.')
      return
    }

    const emailList = userEmails
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0)

    if (emailList.length === 0) {
      setError('Please enter valid email addresses.')
      return
    }

    setSubmitting(true)
    setError(null)
    setFoundUsers([])

    try {
      const users = await validateEmails(emailList)
      setFoundUsers(users)

      const token = Cookies.get('token')
      const quotaResponse = await fetch(`http://localhost:3000/tenants/${parsedTenantId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quota_id: selectedQuotaId,
        }),
      })

      if (!quotaResponse.ok) {
        const errorData = await quotaResponse.json()
        throw new Error(errorData.error || 'Failed to update tenant quota')
      }

      const currentUserIds = new Set(existingUsers.map((user) => user.id))
      const nextUserIds = new Set(users.map((user) => user.id))
      const usersToAdd = users.filter((user) => !currentUserIds.has(user.id))
      const usersToRemove = existingUsers.filter((user) => !nextUserIds.has(user.id))

      for (const user of usersToAdd) {
        const addResponse = await fetch(`http://localhost:3000/tenants/${parsedTenantId}/users`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: user.id }),
        })

        if (!addResponse.ok) {
          const errorData = await addResponse.json()
          throw new Error(errorData.error || `Failed to add user ${user.email}`)
        }
      }

      for (const user of usersToRemove) {
        const removeResponse = await fetch(`http://localhost:3000/tenants/${parsedTenantId}/users/${user.id}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!removeResponse.ok) {
          const errorData = await removeResponse.json()
          throw new Error(errorData.error || `Failed to remove user ${user.email}`)
        }
      }

      navigate('/admin-panel')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update tenant.')
    } finally {
      setSubmitting(false)
    }
  }

  if (initialLoading) {
    return <div>Loading tenant data...</div>
  }

  return (
    <TenantForm
      heading="MTS Cloud Tenant Editor"
      description="Update Tenant Quota and Users"
      submitIdleLabel="Save Tenant"
      submitLoadingLabel="Saving..."
      userEmails={userEmails}
      selectedQuotaId={selectedQuotaId}
      quotas={defaultQuotas}
      foundUsers={foundUsers}
      error={error}
      submitting={submitting}
      onUserEmailsChange={setUserEmails}
      onQuotaChange={setSelectedQuotaId}
      onSubmit={submit}
    />
  )
}
