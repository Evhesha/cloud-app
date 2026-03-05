import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Cookies from 'js-cookie'
import { TenantForm } from './TenantForm'
import { defaultQuotas, validateEmails, type User } from './tenantManagement'

export function CreateTenantModalScreen() {
  const navigate = useNavigate()
  const [userEmails, setUserEmails] = useState<string>('')
  const [selectedQuotaId, setSelectedQuotaId] = useState<number>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [foundUsers, setFoundUsers] = useState<User[]>([])

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
      const response = await fetch('http://localhost:3000/tenants', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quota_id: selectedQuotaId,
          emails: emailList,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create tenant')
      }

      navigate('/admin-panel')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create tenant.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <TenantForm
      heading="MTS Cloud Tenant Onboarding"
      description="Create Tenant for Specific Users"
      submitIdleLabel="Create Tenant"
      submitLoadingLabel="Creating..."
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
