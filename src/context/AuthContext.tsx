/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import Cookies from 'js-cookie'
import { jwtDecode } from 'jwt-decode'

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
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<AuthUser>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
}

const API_BASE_URL = 'http://localhost:3000'
const STORAGE_KEY = 'mts_cloud_user'
const TOKEN_KEY = 'token'

const AuthContext = createContext<AuthContextValue | null>(null)

function parseRole(roleId: number): AuthRole {
  return roleId === 1 ? 'customer' : 'admin'
}

function hasValidToken() {
  const token = Cookies.get(TOKEN_KEY)
  if (!token) {
    return false
  }

  try {
    const payload = jwtDecode<{ exp?: number }>(token)
    if (!payload.exp) {
      return false
    }

    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
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
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (!hasValidToken()) {
      return null
    }

    return parseStoredUser(localStorage.getItem(STORAGE_KEY))
  })

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => hasValidToken())

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
    setIsAuthenticated(true)
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
    setIsAuthenticated(false)
    localStorage.removeItem(STORAGE_KEY)
  }

  useEffect(() => {
    const syncSession = () => {
      const valid = hasValidToken()
      setIsAuthenticated(valid)
      if (!valid) {
        setUser(null)
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    syncSession()
    const intervalId = window.setInterval(syncSession, 15000)
    return () => window.clearInterval(intervalId)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated, login, register, logout }),
    [isAuthenticated, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
