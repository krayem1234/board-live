import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiFetch } from './api'

type User = { id: string; name: string; email: string }
type AuthCtx = {
  token: string | null
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, name: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('bl_token'))
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('bl_user')
    return raw ? JSON.parse(raw) : null
  })

  useEffect(() => {
    if (token) localStorage.setItem('bl_token', token)
    else localStorage.removeItem('bl_token')
  }, [token])

  useEffect(() => {
    if (user) localStorage.setItem('bl_user', JSON.stringify(user))
    else localStorage.removeItem('bl_user')
  }, [user])

  async function login(email: string, password: string) {
    const res = await apiFetch('/auth/login', null, { method: 'POST', body: JSON.stringify({ email, password }) })
    setToken(res.token)
    setUser(res.user)
  }

  async function register(email: string, name: string, password: string) {
    const res = await apiFetch('/auth/register', null, { method: 'POST', body: JSON.stringify({ email, name, password }) })
    setToken(res.token)
    setUser(res.user)
  }

  function logout() {
    setToken(null)
    setUser(null)
  }

  return <Ctx.Provider value={{ token, user, login, register, logout }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
