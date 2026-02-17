"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  GraduationCap,
  Search,
  Bell,
  MessageSquareText,
  ShieldCheck,
  ShieldPlus,
  RefreshCw,
  LogOut,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/contexts/notifications-context"
import { HeaderSettingsDialog } from "@/components/layout/header-settings-dialog"

export type HeaderView = "search" | "newsFeed" | "rpm" | "feedback" | "admin"

interface HeaderProps {
  firstName: string
  onLogout: () => void
  updateTime: string
  onUpdateDatabase?: () => void
  isUpdatingDatabase?: boolean
  activeView?: HeaderView
  onViewChange?: (view: HeaderView) => void
  showRpm?: boolean
  showAdmin?: boolean
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
  showRpm = false,
  showAdmin = false,
}: HeaderProps) {
  const pathname = usePathname()
  const { unreadCount, markAllAsRead } = useNotifications()

  const baseNavItems: HeaderNavItem[] = onViewChange
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
          view: "rpm" as const,
          href: "/rpm",
          label: "RPM",
          icon: ShieldCheck,
        },
        {
          view: "admin" as const,
          href: "/admin",
          label: "Admin",
          icon: ShieldPlus,
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
        { href: "/rpm", label: "RPM", icon: ShieldCheck },
        { href: "/admin", label: "Admin", icon: ShieldPlus },
        {
          href: "/feedback",
          label: "Feedback",
          icon: MessageSquareText,
        },
      ]

  const navItems: HeaderNavItem[] = baseNavItems.filter((item) => {
    const isRpmItem = item.view === "rpm" || item.href === "/rpm"
    const isAdminItem = item.view === "admin" || item.href === "/admin"
    if (isRpmItem && !showRpm) {
      return false
    }
    if (isAdminItem && !showAdmin) {
      return false
    }

    return true
  })

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
                  Updated - {updateTime}
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
              <p className="sr-only">Signed in as {firstName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-[var(--brand-body)]">
            <div className="hidden md:flex items-center gap-4">
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
            </div>

            <div className="flex items-center gap-2">
              <HeaderSettingsDialog />
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(201,18,41,0.35)] bg-transparent px-3 py-1.5 text-xs font-semibold text-[var(--brand-danger)] transition-colors hover:border-[rgba(201,18,41,0.55)] hover:bg-[rgba(201,18,41,0.08)]"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
