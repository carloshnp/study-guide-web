/**
 * Shared authentication context backed by HttpOnly session cookies (`/api/auth/*`).
 *
 * Exposes `sessionKey`, which increments on login, register, and logout after
 * resetting the client progress store so user-scoped views (notes sidebar,
 * highlights, progress, flashcards) cleanly remount for the new account.
 */

"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { resetProgressStore } from "@/features/progress/useProgress"

import { authApi, type AuthUser } from "./api"

export type AuthContextValue = {
  user: AuthUser | null
  hasUsers: boolean
  authRequired: boolean
  loading: boolean
  sessionKey: string
  login: (input: { username: string; password: string }) => Promise<AuthUser>
  register: (input: {
    username: string
    displayName?: string
    password: string
  }) => Promise<AuthUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const NOOP_AUTH: AuthContextValue = {
  authRequired: false,
  hasUsers: false,
  loading: false,
  login: async () => {
    throw new Error("AuthProvider not mounted")
  },
  logout: async () => undefined,
  refresh: async () => undefined,
  register: async () => {
    throw new Error("AuthProvider not mounted")
  },
  sessionKey: "anon:0",
  user: null,
}

const AuthContext = createContext<AuthContextValue>(NOOP_AUTH)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [hasUsers, setHasUsers] = useState(false)
  const [authRequired, setAuthRequired] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generation, setGeneration] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const status = await authApi.me()
      setUser(status.user)
      setHasUsers(status.hasUsers)
      setAuthRequired(status.authRequired)
    } catch {
      // Leave defaults in offline/unit-test environments without an auth backend.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    authApi
      .me()
      .then((status) => {
        if (cancelled) return
        setUser(status.user)
        setHasUsers(status.hasUsers)
        setAuthRequired(status.authRequired)
      })
      .catch(() => {
        // Leave defaults in offline/unit-test environments without an auth backend.
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (input: { username: string; password: string }) => {
    const signedIn = await authApi.login(input)
    resetProgressStore()
    setUser(signedIn)
    setHasUsers(true)
    setAuthRequired(true)
    setGeneration((n) => n + 1)
    return signedIn
  }, [])

  const register = useCallback(
    async (input: { username: string; displayName?: string; password: string }) => {
      const created = await authApi.register(input)
      resetProgressStore()
      setUser(created)
      setHasUsers(true)
      setAuthRequired(true)
      setGeneration((n) => n + 1)
      return created
    },
    [],
  )

  const logout = useCallback(async () => {
    await authApi.logout()
    resetProgressStore()
    setUser(null)
    setGeneration((n) => n + 1)
  }, [])

  const sessionKey = `${user ? `u:${user.id}` : "anon"}:${generation}`

  const value = useMemo<AuthContextValue>(
    () => ({
      authRequired,
      hasUsers,
      loading,
      login,
      logout,
      refresh,
      register,
      sessionKey,
      user,
    }),
    [authRequired, hasUsers, loading, login, logout, refresh, register, sessionKey, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
