"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { GraduationCap, Search, BarChart3, Bell, Users, LogOut, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/contexts/notifications-context"

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
  const pathname = usePathname()
  const { unreadCount, markAllAsRead } = useNotifications()

  const navItems = [
    { href: "/", label: "Search", icon: Search },
    // { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/newsFeed", label: "News Feed", icon: Bell, clearOnClick: true },
  ]

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
          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600">
            <nav className="flex items-center gap-1 rounded-full border border-slate-300/80 bg-white/90 p-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname?.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={item.clearOnClick ? markAllAsRead : undefined}
                    className={cn(
                      "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                    {item.href === "/newsFeed" && unreadCount > 0 ? (
                      <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-md shadow-red-600/30">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </nav>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Hello, {firstName}!
            </div>
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
