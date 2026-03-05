import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import Cookies from 'js-cookie'

type Quota = {
  id: number
  name: string
  cpu_limit: number
  ram_limit: number
  disk_limit: string
  vm_limit: number
}

type User = {
  id: number
  name: string
  email: string
}

export function CreateTenantModalScreen() {
  const navigate = useNavigate()
  const [quotas] = useState<Quota[]>([
    { id: 1, name: 'basic', cpu_limit: 2, ram_limit: 4096, disk_limit: '50', vm_limit: 2 },
    { id: 2, name: 'intermediate', cpu_limit: 4, ram_limit: 8192, disk_limit: '100', vm_limit: 5 },
    { id: 3, name: 'professional', cpu_limit: 8, ram_limit: 16384, disk_limit: '200', vm_limit: 10 }
  ])

  const [userEmails, setUserEmails] = useState<string>('') // Можно ввести несколько email через запятую
  const [selectedQuotaId, setSelectedQuotaId] = useState<number>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [foundUsers, setFoundUsers] = useState<User[]>([]) // Найденные пользователи

  // Функция для поиска пользователей по email
  const findUsersByEmails = async (emails: string[]): Promise<User[]> => {
    const token = Cookies.get('token')
    const found: User[] = []
    const notFound: string[] = []

    // Ищем каждого пользователя по email
    for (const email of emails) {
      try {
        const response = await fetch(`http://localhost:3000/users?email=${encodeURIComponent(email.trim())}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          notFound.push(email)
          continue
        }

        const users = await response.json()
        const user = Array.isArray(users) ? users[0] : users
        
        if (user && user.id) {
          found.push(user)
        } else {
          notFound.push(email)
        }
      } catch (error) {
        console.error(`Error finding user ${email}:`, error)
        notFound.push(email)
      }
    }

    if (notFound.length > 0) {
      throw new Error(`Users not found: ${notFound.join(', ')}`)
    }

    return found
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!userEmails.trim()) {
      setError('At least one user email is required.')
      return
    }

    // Разбиваем email по запятой и удаляем лишние пробелы
    const emailList = userEmails.split(',').map(email => email.trim()).filter(email => email.length > 0)
    
    if (emailList.length === 0) {
      setError('Please enter valid email addresses.')
      return
    }

    setSubmitting(true)
    setError(null)
    setFoundUsers([])

    try {
      // Ищем пользователей по email
      const users = await findUsersByEmails(emailList)
      setFoundUsers(users)

      const token = Cookies.get('token')
      
      // Создаем тенант с привязкой к найденным пользователям
      const response = await fetch('http://localhost:3000/tenants', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quota_id: selectedQuotaId,
          userIds: users.map(u => u.id) // Передаем массив ID найденных пользователей
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create tenant')
      }

      const data = await response.json()
      console.log('Tenant created:', data)
      console.log('Assigned users:', users)
      
      navigate('/admin-panel')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create tenant.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mts-page">
      <main className="mts-main">
        <header className="page-head">
          <div>
            <p className="mts-kicker">Tenant Management</p>
            <h2>MTS Cloud Tenant Onboarding</h2>
          </div>
          <NavLink to="/admin-panel" className="btn-secondary-pill">
            Cancel
          </NavLink>
        </header>

        <form className="panel-flat deploy-form" onSubmit={submit}>
          <p className="project-line">
            Administrator Control Plane: <strong>Create Tenant for Specific Users</strong>
          </p>

          <div className="form-grid">
            <label>
              User Email(s)
              <input
                type="text"
                value={userEmails}
                onChange={(event) => setUserEmails(event.target.value)}
                placeholder="user1@company.com, user2@company.com"
                required
              />
              <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                Enter one or more email addresses separated by commas
              </small>
            </label>
          </div>

          {foundUsers.length > 0 && (
            <div style={{ marginTop: '16px', padding: '12px', background: '#f0f9ff', borderRadius: '6px' }}>
              <strong>Users to be assigned:</strong>
              <ul style={{ marginTop: '8px', listStyle: 'none', padding: 0 }}>
                {foundUsers.map(user => (
                  <li key={user.id} style={{ padding: '4px 0' }}>
                    • {user.name} ({user.email})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3>Select Quota</h3>
            <div className="choice-grid">
              {quotas.map((quota) => (
                <button
                  key={quota.id}
                  type="button"
                  className={`choice-card ${selectedQuotaId === quota.id ? 'active' : ''}`}
                  onClick={() => setSelectedQuotaId(quota.id)}
                >
                  <strong>{quota.name.charAt(0).toUpperCase() + quota.name.slice(1)}</strong>
                  <span>
                    {quota.cpu_limit} vCPU • {quota.ram_limit / 1024}GB RAM • {quota.disk_limit}GB Storage
                  </span>
                  <small>Max Instances: {quota.vm_limit}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="deploy-footer">
            {error && <p className="guard-warning">{error}</p>}
            <button type="submit" className="btn-primary-pill" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </main>
    </section>
  )
}