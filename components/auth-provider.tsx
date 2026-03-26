"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import type { User } from "@supabase/supabase-js"

import { supabaseRealtime } from "@/lib/supabase"

interface AuthContextValue {
  displayName: string | null
  isLoading: boolean
  isSignedIn: boolean
  refreshSession: () => Promise<void>
  signOut: () => Promise<void>
  user: User | null
  accessToken: string | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

function getDisplayName(user: User | null) {
  const metadataName =
    typeof user?.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : null

  if (metadataName) {
    return metadataName
  }

  if (user?.email) {
    return user.email
  }

  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  const refreshSession = useCallback(async () => {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "include",
    })

    const data = await response.json().catch(() => null)
    const nextSession = data?.session ?? null

    setAccessToken(nextSession?.accessToken ?? null)
    setUser(nextSession?.user ?? null)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadSession() {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
      })
      const data = await response.json().catch(() => null)
      const nextSession = data?.session ?? null

      if (!isMounted) {
        return
      }

      setAccessToken(nextSession?.accessToken ?? null)
      setUser(nextSession?.user ?? null)
      setIsLoading(false)
    }

    void loadSession()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    supabaseRealtime.realtime.setAuth(accessToken)
  }, [accessToken])

  const value = useMemo<AuthContextValue>(
    () => ({
      displayName: getDisplayName(user),
      isLoading,
      isSignedIn: Boolean(user),
      refreshSession,
      signOut: async () => {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        })
        setAccessToken(null)
        setUser(null)
      },
      user,
      accessToken,
    }),
    [accessToken, isLoading, refreshSession, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }

  return context
}
