"use client"

import { GraduationCap, Users, LogOut, RefreshCw } from "lucide-react"

interface HeaderProps {
  firstName: string
  onLogout: () => void
  updateTime: string
  onUpdateDatabase?: () => void
  isUpdatingDatabase?: boolean
}

export default function Header({
  firstName,
  onLogout,
  updateTime,
  onUpdateDatabase,
  isUpdatingDatabase = false,
}: HeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-600/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  Last Updated - {updateTime}
                </h1>
                {onUpdateDatabase ? (
                  <button
                    type="button"
                    onClick={onUpdateDatabase}
                    disabled={isUpdatingDatabase}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${
                        isUpdatingDatabase ? "animate-spin" : ""
                      }`}
                    />
                    {isUpdatingDatabase ? "Updating..." : "Update"}
                  </button>
                ) : null}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Tool to search student profiles for improved match making</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a className="hover:text-blue-600 transition-colors duration-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Hello, {firstName}!
            </a>
            {/* <a href="#" className="hover:text-blue-600 transition-colors duration-200 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Programs
                </a>
                <a href="#" className="hover:text-blue-600 transition-colors duration-200">
                  About
                </a>
                <a href="#" className="hover:text-blue-600 transition-colors duration-200">
                  Contact
                </a> */}
            <button
              onClick={onLogout}
              className="hover:text-red-600 transition-colors duration-200 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
