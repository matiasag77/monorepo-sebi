"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useCallback, useEffect } from "react"
import { setToken, clearToken } from "@/lib/api"

export function useAuth() {
  const { data: session, status } = useSession()

  const user = session?.user ?? null
  const isAdmin = user?.role === "admin"
  const backendToken = session?.backendToken ?? null
  const isLoading = status === "loading"
  const isAuthenticated = status === "authenticated"

  // Sync token to localStorage for API client
  useEffect(() => {
    if (backendToken) {
      setToken(backendToken)
    } else if (status === "unauthenticated") {
      clearToken()
    }
  }, [backendToken, status])

  const loginWithCredentials = useCallback(
    async (email: string, password: string) => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        throw new Error("Invalid credentials")
      }

      return result
    },
    []
  )

  const loginWithGoogle = useCallback(async () => {
    await signIn("google", { callbackUrl: "/chat" })
  }, [])

  const logout = useCallback(async () => {
    clearToken()
    await signOut({ callbackUrl: "/login" })
  }, [])

  return {
    user,
    session,
    status,
    isAdmin,
    isLoading,
    isAuthenticated,
    backendToken,
    loginWithCredentials,
    loginWithGoogle,
    logout,
  }
}
