import Cookies from 'js-cookie'

export type Quota = {
  id: number
  name: string
  cpu_limit: number
  ram_limit: number
  disk_limit: string
  vm_limit: number
}

export type User = {
  id: number
  name: string
  email: string
}

export const defaultQuotas: Quota[] = [
  { id: 1, name: 'basic', cpu_limit: 2, ram_limit: 4096, disk_limit: '50', vm_limit: 2 },
  { id: 2, name: 'intermediate', cpu_limit: 4, ram_limit: 8192, disk_limit: '100', vm_limit: 5 },
  { id: 3, name: 'professional', cpu_limit: 8, ram_limit: 16384, disk_limit: '200', vm_limit: 10 }
]

export async function validateEmails(emails: string[]): Promise<User[]> {
  const token = Cookies.get('token')

  const response = await fetch('http://localhost:3000/users', {
    method: 'GET',
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch users')
  }

  const allUsers: User[] = await response.json()
  const found: User[] = []
  const notFound: string[] = []

  for (const email of emails) {
    const user = allUsers.find((item) => item.email.toLowerCase() === email.toLowerCase())

    if (user) {
      found.push(user)
    } else {
      notFound.push(email)
    }
  }

  if (notFound.length > 0) {
    throw new Error(`Users not found: ${notFound.join(', ')}`)
  }

  return found
}
