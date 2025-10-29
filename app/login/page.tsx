"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GraduationCap, Lock, User, AlertCircle, CheckCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [first_name, setFirstname] = useState("")
  const [code, setCode] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [verifyPassword, setVerifyPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { login, register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (mode === "register") {
      if (password !== verifyPassword) {
        setError("Passwords do not match. Please try again.")
        return
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters long.")
        return
      }
    }

    setIsLoading(true)

    if (mode === "register") {
      const result = await register(first_name, username, password, code)
      if (result.success) {
        setSuccess("Account created successfully! Please sign in.")
        setMode("login")
        setPassword("")
        setVerifyPassword("")
      } else {
        setError(result.error || "Failed to create account. Please try again.")
      }
    } else {
      const result = await login(username, password)
      if (result.success) {
        router.push("/")
      } else {
        setError(result.error || "Invalid username or password. Please try again.")
      }
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/30 relative overflow-hidden flex items-center justify-center">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-gradient-to-br from-blue-500/12 to-indigo-500/12 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-violet-500/10 to-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/8 to-purple-500/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-2xl shadow-slate-900/10 p-8">
          {/* Logo and Title */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-orange-300 via-white-600 to-orange-600 p-3 rounded-xl shadow-lg shadow-blue-600/20 mb-4">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight text-center">Student Search Portal</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {mode === "login" ? "Sign in to continue" : "Create your account"}
            </p>
          </div>

          {success && (
            <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Login/Register Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="pl-10 h-11 text-slate-700 bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 h-11 text-slate-700 bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label htmlFor="verifyPassword" className="block text-sm font-semibold text-slate-700 mb-2">
                  Verify Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="verifyPassword"
                    type="password"
                    value={verifyPassword}
                    onChange={(e) => setVerifyPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="pl-10 h-11 text-slate-700 bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label htmlFor="first_name" className="block text-sm font-semibold text-slate-700 mb-2">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="first_name"
                      type="text"
                      value={first_name}
                      onChange={(e) => setFirstname(e.target.value)}
                      placeholder="Enter your First Name"
                      className="pl-10 h-11 text-slate-700 bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="code" className="block text-sm font-semibold text-slate-700 mb-2">
                    Sign up code
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="code"
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Verification Phrase"
                      className="pl-10 h-11 text-slate-700 bg-white border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? mode === "login"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </Button>
          </form>

          {/* Toggle between login and register modes */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-sm text-center text-slate-600">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login")
                  setError("")
                  setSuccess("")
                  setPassword("")
                  setVerifyPassword("")
                }}
                className="text-blue-600 hover:text-blue-700 font-semibold"
                disabled={isLoading}
              >
                {mode === "login" ? "Create Account" : "Sign In"}
              </button>
            </p>
          </div>

          {/* Footer */}
          {/* <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs text-center text-slate-500">
              Need help?{" "}
              <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                Contact Support
              </a>
            </p>
          </div> */}
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">&copy; 2025 Student Exchange Portal. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
