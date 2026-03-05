"use client"

import { usePathname, useRouter } from "next/navigation"
import {
  GraduationCap,
  Search,
  Bell,
  MessageSquareText,
  ShieldCheck,
  ShieldPlus,
  LogOut,
  PanelTop,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useNotifications } from "@/contexts/notifications-context"
import { HeaderSettingsDialog } from "@/components/layout/header-settings-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"

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
  const router = useRouter()
  const pathname = usePathname()
  const { markAllAsRead } = useNotifications()

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

  const mobileViewOptions = navItems.map((item) => ({
    ...item,
    value: onViewChange ? (item.view ?? item.href) : item.href,
  }))

  const activeMobileValue = onViewChange
    ? mobileViewOptions.find((item) => item.view === activeView)?.value ??
      mobileViewOptions[0]?.value
    : mobileViewOptions.find((item) =>
        item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href)
      )?.value ?? mobileViewOptions[0]?.value

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--brand-border-soft)] bg-[var(--brand-shell-bg)] backdrop-blur-xl shadow-[0_8px_20px_rgba(0,53,84,0.08)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (onViewChange) {
                  onViewChange("search")
                  return
                }
                router.push("/")
              }}
              aria-label="Go to search view"
              title="Go to search view"
              className="rounded-xl bg-gradient-to-br from-[var(--brand-primary-deep)] via-[var(--brand-primary)] to-[var(--brand-secondary)] p-2 shadow-lg shadow-[rgba(0,94,184,0.28)] transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(0,94,184,0.35)]"
            >
              <GraduationCap className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--brand-muted)]">
                {updateTime || "Not available"}
              </p>
            </div>
            <p className="sr-only">Signed in as {firstName}</p>
          </div>
          <div className="flex items-center gap-3 text-sm font-medium text-[var(--brand-body)]">
            <div className="flex items-center gap-2">
              {mobileViewOptions.length > 0 ? (
                <Select
                  value={activeMobileValue}
                  onValueChange={(value) => {
                    const selectedItem = mobileViewOptions.find(
                      (item) => item.value === value
                    )

                    if (!selectedItem) return

                    if (selectedItem.clearOnClick) {
                      markAllAsRead()
                    }

                    if (onViewChange && selectedItem.view) {
                      onViewChange(selectedItem.view)
                      return
                    }

                    router.push(selectedItem.href)
                  }}
                >
                  <SelectTrigger
                    aria-label="Select view"
                    className="!inline-flex !h-8 !w-8 !items-center !justify-center !gap-0 !rounded-lg !border-[var(--brand-border-soft)] !bg-[rgba(253,254,255,0.9)] !p-0 !text-[var(--brand-body)] !shadow-sm transition-colors hover:!bg-[rgba(0,94,184,0.08)] hover:!text-[var(--brand-ink)] data-[state=open]:!border-[var(--brand-primary)] data-[state=open]:!bg-[rgba(0,94,184,0.08)] [&>svg:last-child]:hidden"
                  >
                    <PanelTop className="h-4 w-4" />
                  </SelectTrigger>
                  <SelectContent className="z-[95] border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.98)] backdrop-blur-xl">
                    {mobileViewOptions.map((item) => {
                      const Icon = item.icon
                      return (
                        <SelectItem key={item.value} value={item.value}>
                          <span className="inline-flex items-center gap-2 text-[var(--brand-body)]">
                            <Icon className="h-4 w-4 text-[var(--brand-primary)]" />
                            {item.label}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              ) : null}
              <HeaderSettingsDialog
                onUpdateDatabase={onUpdateDatabase}
                isUpdatingDatabase={isUpdatingDatabase}
              />
              <button
                type="button"
                onClick={onLogout}
                aria-label="Logout"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(201,18,41,0.35)] bg-transparent text-xs font-semibold text-[var(--brand-danger)] transition-colors hover:border-[rgba(201,18,41,0.55)] hover:bg-[rgba(201,18,41,0.08)]"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
