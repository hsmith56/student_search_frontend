"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

interface AuthContextType {
  isAuthenticated: boolean
  username: string | null
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (first_name: string, username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_URL =  "http://127.0.0.1:8000" //  process.env.NEXT_PUBLIC_API_URL ||

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const checkAuth = async () => {
    try {
      console.log("[v0] Checking auth status at", `${API_URL}/auth/me`)
      const response = await fetch(`${API_URL}/auth/me`, {
        credentials: "include",
      })

      console.log("[v0] /auth/me response status:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Auth check successful, user:", data.username)
        setIsAuthenticated(true)
        setUsername(data.username)
        return true
      } else {
        console.log("[v0] Auth check failed - not authenticated")
        setIsAuthenticated(false)
        setUsername(null)
        return false
      }
    } catch (error) {
      console.error("[v0] Auth check error:", error)
      setIsAuthenticated(false)
      setUsername(null)
      return false
    }
  }

  useEffect(() => {
    const initialCheck = async () => {
      await checkAuth()
      setIsLoading(false)
    }
    initialCheck()
  }, [])

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const formData = new URLSearchParams()
      formData.append("grant_type", "password")
      formData.append("username", username)
      formData.append("password", password)

      console.log("[v0] Attempting login for user:", username, "at", `${API_URL}/auth/login`)

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          accept: "application/json",
        },
        credentials: "include",
        body: formData.toString(),
      })

      console.log("[v0] Login response status:", response.status)

      if (response.ok) {
        console.log("[v0] Login successful, checking auth status...")
        await new Promise((resolve) => setTimeout(resolve, 100))
        const authVerified = await checkAuth()

        if (authVerified) {
          console.log("[v0] Auth verified after login")
          return { success: true }
        } else {
          console.error("[v0] Login succeeded but auth check failed - cookie not working")
          return {
            success: false,
            error:
              "Login succeeded but session cookie is not working. Your backend needs to set cookies with SameSite=None and Secure=True, and use HTTPS (try ngrok).",
          }
        }
      }

      let errorMessage = "Invalid username or password. Please try again."
      try {
        const errorData = await response.json()
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail)
        }
      } catch {
        // If parsing fails, use default error message
      }

      return { success: false, error: errorMessage }
    } catch (error) {
      console.error("[v0] Login error:", error)
      return {
        success: false,
        error: `Cannot connect to backend at ${API_URL}. Make sure NEXT_PUBLIC_API_URL is set to your ngrok or deployed backend URL.`,
      }
    }
  }

  const register = async (first_name: string, username: string, password: string, code: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("[v0] Attempting registration for user:", username)

      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password, first_name, code}),
      })

      console.log("[v0] Registration response status:", response.status)

      if (response.ok) {
        console.log("[v0] Registration successful")
        return { success: true }
      }

      let errorMessage = "Failed to create account. Please try again."
      try {
        const errorData = await response.json()
        if (errorData.detail) {
          errorMessage = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail)
        }
      } catch {
        // If parsing fails, use default error message
      }

      return { success: false, error: errorMessage }
    } catch (error) {
      console.error("[v0] Registration error:", error)
      return {
        success: false,
        error: `Cannot connect to backend at ${API_URL}. Make sure NEXT_PUBLIC_API_URL is set to your ngrok or deployed backend URL.`,
      }
    }
  }

  const logout = async () => {
    try {
      console.log("[v0] Logging out")
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      })
    } catch (error) {
      console.error("[v0] Logout error:", error)
    } finally {
      setIsAuthenticated(false)
      setUsername(null)
      router.push("/login")
    }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
