/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type AuthRole = 'customer' | 'admin'

export type AuthUser = {
  id: number | string
  name: string
  email: string
  roleId: number
  role: AuthRole
}

type LoginPayload = {
  email: string
  password: string
}

type RegisterPayload = {
  name: string
  email: string
  password: string
}

type AuthContextValue = {
  user: AuthUser | null
  login: (payload: LoginPayload) => Promise<AuthUser>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
}

const API_BASE_URL = 'http://localhost:3000'
const STORAGE_KEY = 'mts_cloud_user'

const AuthContext = createContext<AuthContextValue | null>(null)

function parseRole(roleId: number): AuthRole {
  return roleId === 1 ? 'customer' : 'admin'
}

function parseStoredUser(raw: string | null): AuthUser | null {
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>
    if (!parsed.id || !parsed.email || !parsed.name) {
      return null
    }

    const roleId = typeof parsed.roleId === 'number' ? parsed.roleId : parsed.role === 'customer' ? 1 : 2
    return {
      id: parsed.id,
      email: parsed.email,
      name: parsed.name,
      roleId,
      role: parseRole(roleId),
    }
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => parseStoredUser(localStorage.getItem(STORAGE_KEY)))

  const login = async (payload: LoginPayload) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    })

    const data = (await response.json()) as
      | { user: { id: number | string; name: string; email: string; role_id?: number } }
      | { error?: string }

    if (!response.ok || !('user' in data)) {
      throw new Error(('error' in data && data.error) || 'Unable to sign in.')
    }

    const roleId = data.user.role_id
    if (roleId === undefined) {
      throw new Error('User model does not contain role_id.')
    }

    const normalized: AuthUser = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      roleId,
      role: parseRole(roleId),
    }

    setUser(normalized)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    return normalized
  }

  const register = async (payload: RegisterPayload) => {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        password: payload.password,
      }),
      credentials: 'include',
    })

    const data = (await response.json()) as { error?: string }

    if (!response.ok) {
      throw new Error(data.error || 'Unable to register user.')
    }
  }

  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // No-op: local logout still happens
    }

    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const value = useMemo<AuthContextValue>(() => ({ user, login, register, logout }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
