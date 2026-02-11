"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  GraduationCap,
  Search,
  Bell,
  MessageSquareText,
  LayoutDashboard,
  Users,
  LogOut,
  RefreshCw,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/contexts/notifications-context"

export type HeaderView = "search" | "newsFeed" | "dashboard" | "feedback"

interface HeaderProps {
  firstName: string
  onLogout: () => void
  updateTime: string
  onUpdateDatabase?: () => void
  isUpdatingDatabase?: boolean
  activeView?: HeaderView
  onViewChange?: (view: HeaderView) => void
}

type HeaderNavItem = {
  href: string
  label: string
  icon: LucideIcon
  view?: HeaderView
  clearOnClick?: boolean
}

export default function Header({
  firstName,
  onLogout,
  updateTime,
  onUpdateDatabase,
  isUpdatingDatabase = false,
  activeView,
  onViewChange,
}: HeaderProps) {
  const pathname = usePathname()
  const { unreadCount, markAllAsRead } = useNotifications()

  const navItems: HeaderNavItem[] = onViewChange
    ? [
        { view: "search" as const, href: "/", label: "Search", icon: Search },
        {
          view: "newsFeed" as const,
          href: "/newsFeed",
          label: "News Feed",
          icon: Bell,
          clearOnClick: true,
        },
        {
          view: "dashboard" as const,
          href: "/dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
        },
        {
          view: "feedback" as const,
          href: "/feedback",
          label: "Feedback",
          icon: MessageSquareText,
        },
      ]
    : [
        { href: "/", label: "Search", icon: Search },
        {
          href: "/newsFeed",
          label: "News Feed",
          icon: Bell,
          clearOnClick: true,
        },
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        {
          href: "/feedback",
          label: "Feedback",
          icon: MessageSquareText,
        },
      ]

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--brand-border-soft)] bg-[var(--brand-shell-bg)] backdrop-blur-xl shadow-[0_8px_20px_rgba(0,53,84,0.08)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-gradient-to-br from-[var(--brand-primary-deep)] via-[var(--brand-primary)] to-[var(--brand-secondary)] p-2 shadow-lg shadow-[rgba(0,94,184,0.28)]">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-[var(--brand-ink)]">
                  Last Updated - {updateTime}
                </h1>
                {onUpdateDatabase ? (
                  <button
                    type="button"
                    onClick={onUpdateDatabase}
                    disabled={isUpdatingDatabase}
                    className="inline-flex items-center gap-1 rounded-md border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-2 py-1 text-xs font-semibold text-[var(--brand-body)] shadow-sm transition-colors hover:bg-[var(--brand-surface)] disabled:cursor-not-allowed disabled:opacity-70"
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
              <p className="text-[11px] font-medium text-[var(--brand-muted)]">Tool to search student profiles for improved match making</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-[var(--brand-body)]">
            <nav className="flex items-center gap-1 rounded-full border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.9)] p-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = onViewChange
                  ? activeView === item.view
                  : item.href === "/"
                    ? pathname === "/"
                    : pathname?.startsWith(item.href)
                const isNewsFeedItem =
                  item.view === "newsFeed" || item.href === "/newsFeed"

                if (onViewChange) {
                  const view = item.view

                  if (!view) {
                    return null
                  }

                  return (
                    <button
                      key={view}
                      type="button"
                      onClick={() => {
                        if (item.clearOnClick) {
                          markAllAsRead()
                        }
                        onViewChange(view)
                      }}
                      className={cn(
                        "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                        isActive
                          ? "bg-[var(--brand-primary)] text-white shadow-sm"
                          : "text-[var(--brand-body)] hover:bg-[rgba(0,94,184,0.1)] hover:text-[var(--brand-ink)]"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                      {isNewsFeedItem && unreadCount > 0 ? (
                        <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--brand-danger)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-md shadow-[rgba(201,18,41,0.35)]">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      ) : null}
                    </button>
                  )
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={item.clearOnClick ? markAllAsRead : undefined}
                    className={cn(
                      "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                      isActive
                        ? "bg-[var(--brand-primary)] text-white shadow-sm"
                        : "text-[var(--brand-body)] hover:bg-[rgba(0,94,184,0.1)] hover:text-[var(--brand-ink)]"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                    {isNewsFeedItem && unreadCount > 0 ? (
                      <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--brand-danger)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-md shadow-[rgba(201,18,41,0.35)]">
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
              className="flex items-center gap-1.5 transition-colors duration-200 hover:text-[var(--brand-danger)]"
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
