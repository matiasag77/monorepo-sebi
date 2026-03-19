"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MessageSquare,
  History,
  LayoutDashboard,
  Users,
  Sparkles,
  LogOut,
  Menu,
  Bot,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: "Chat", href: "/chat", icon: <MessageSquare className="w-5 h-5" /> },
  { label: "Historial", href: "/history", icon: <History className="w-5 h-5" /> },
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="w-5 h-5" />, adminOnly: true },
  { label: "Usuarios", href: "/admin/users", icon: <Users className="w-5 h-5" />, adminOnly: true },
  { label: "Sugerencias", href: "/admin/suggestions", icon: <Sparkles className="w-5 h-5" />, adminOnly: true },
]

function SidebarContent({
  collapsed,
  onCollapse,
  onNavigate,
}: {
  collapsed: boolean
  onCollapse?: () => void
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const { user, isAdmin, logout, isLoading } = useAuth()

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  )

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex items-center gap-3 p-4 pt-5", collapsed && "justify-center px-2")}>
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h2 className="text-sm font-bold text-white truncate">Sebi AI</h2>
            <p className="text-[11px] text-zinc-500 truncate">Asistente</p>
          </div>
        )}
      </div>

      <Separator className="mx-3 w-auto" />

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/chat" &&
              item.href !== "/history" &&
              item.href !== "/admin" &&
              pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                collapsed && "justify-center px-2",
                isActive
                  ? "bg-blue-600/15 text-blue-400 border border-blue-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Collapse button (desktop only) */}
      {onCollapse && (
        <div className="px-3 pb-2">
          <button
            onClick={onCollapse}
            className="flex items-center justify-center w-full p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      )}

      <Separator className="mx-3 w-auto" />

      {/* User section */}
      <div className={cn("p-3", collapsed && "px-2")}>
        {isLoading ? (
          <div className="flex items-center gap-3 p-2">
            <Skeleton className="w-9 h-9 rounded-full" />
            {!collapsed && (
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            )}
          </div>
        ) : (
          <div className={cn("flex items-center gap-3 p-2", collapsed && "justify-center")}>
            <Avatar className="w-9 h-9 shrink-0">
              <AvatarImage src={user?.image || undefined} />
              <AvatarFallback className="bg-zinc-800 text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-[11px] text-zinc-500 truncate">
                  {user?.email || ""}
                </p>
              </div>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className={cn(
            "mt-1 text-zinc-400 hover:text-red-400 hover:bg-red-500/10",
            !collapsed && "w-full justify-start"
          )}
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Cerrar sesión</span>}
        </Button>
      </div>
    </div>
  )
}

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar-bg transition-all duration-300 shrink-0",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          onCollapse={() => setCollapsed(!collapsed)}
        />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar-bg border-sidebar-border">
          <SidebarContent
            collapsed={false}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 p-3 border-b border-zinc-800/50 bg-background/80 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="text-zinc-400"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">Sebi AI</span>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">{children}</div>
      </main>
    </div>
  )
}
