import { createContext, useContext, useEffect, useState } from 'react'
import { db, useData } from './db'
import { setSessionUser, runReminders } from './actions'

const KEY = 'smart-society-session'
const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [userId, setUserId] = useState(() => {
    try { return localStorage.getItem(KEY) } catch { return null }
  })
  const user = useData((d) => (userId ? d.get('users', userId) : null))

  useEffect(() => {
    setSessionUser(user?.id || null)
    if (user) runReminders(user)
  }, [user?.id])

  const login = (id) => {
    try { localStorage.setItem(KEY, id) } catch { /* ignore */ }
    setUserId(id)
  }
  const logout = () => {
    try { localStorage.removeItem(KEY) } catch { /* ignore */ }
    setUserId(null)
  }
  return <AuthCtx.Provider value={{ user: user && user.status === 'active' ? user : null, login, logout, society: db.society() }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
