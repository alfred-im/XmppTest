/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useCallback } from 'react'
import type { ReactNode } from 'react'
import { saveCredentials, clearCredentials } from '../services/auth-storage'

interface AuthContextType {
  login: (jid: string, password: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const login = useCallback((jid: string, password: string) => {
    saveCredentials(jid, password)
  }, [])

  const logout = useCallback(() => {
    clearCredentials()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve essere usato dentro AuthProvider')
  }
  return context
}
