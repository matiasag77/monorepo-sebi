"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Activity,
  ArrowRight,
  Clock,
  TrendingUp,
  UserCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import * as api from "@/lib/api"

interface StatsCard {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  bgColor: string
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<{ total: number; active: number }>({ total: 0, active: 0 })
  const [events, setEvents] = useState<
    { _id: string; userId: string; action: string; metadata?: Record<string, unknown>; createdAt: string }[]
  >([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersData, eventsData] = await Promise.all([
          api.getUsers(),
          api.getTrackingEvents(1, 10),
        ])

        setUsers({
          total: usersData.length,
          active: usersData.filter((u) => u.isActive).length,
        })
        setEvents(eventsData.events || [])
      } catch {
        // silently fail
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const stats: StatsCard[] = [
    {
      label: "Total de Usuarios",
      value: users.total,
      icon: <Users className="w-5 h-5" />,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Usuarios Activos",
      value: users.active,
      icon: <UserCheck className="w-5 h-5" />,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Eventos Recientes",
      value: events.length,
      icon: <Activity className="w-5 h-5" />,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    {
      label: "Estado del Sistema",
      value: "En línea",
      icon: <TrendingUp className="w-5 h-5" />,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
    },
  ]

  const formatEventTime = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return "Ahora mismo"
    if (diffMins < 60) return `hace ${diffMins}m`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `hace ${diffHours}h`
    return d.toLocaleDateString("es-AR", { month: "short", day: "numeric" })
  }

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("login")) return "success" as const
    if (action.includes("delete")) return "destructive" as const
    if (action.includes("create")) return "default" as const
    return "secondary" as const
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <LayoutDashboard className="w-6 h-6 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
            </div>
            <p className="text-sm text-zinc-400 ml-9">
              Resumen de tu aplicación
            </p>
          </div>
          <Link href="/admin/users">
            <Button variant="outline" size="sm">
              <Users className="w-4 h-4 mr-1" />
              Gestionar Usuarios
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) =>
            isLoading ? (
              <Card key={i} className="p-5">
                <Skeleton className="h-10 w-10 rounded-lg mb-3" />
                <Skeleton className="h-7 w-16 mb-1" />
                <Skeleton className="h-4 w-24" />
              </Card>
            ) : (
              <Card key={i} className="p-5 hover:border-zinc-700 transition-colors">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                    stat.bgColor
                  )}
                >
                  <span className={stat.color}>{stat.icon}</span>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-zinc-400 mt-0.5">{stat.label}</p>
              </Card>
            )
          )}
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Actividad Reciente
              </CardTitle>
              <Badge variant="secondary">{events.length} eventos</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-2 h-2 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-5 w-16 rounded-md" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-10">
                <Activity className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">Sin actividad reciente</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-1">
                  {events.map((event) => (
                    <div
                      key={event._id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-800/40 transition-colors group"
                    >
                      <div className="w-2 h-2 rounded-full bg-zinc-600 group-hover:bg-blue-400 transition-colors shrink-0" />
                      <span className="text-sm text-zinc-300 flex-1 truncate">
                        {event.action}
                      </span>
                      <Badge variant={getActionBadgeVariant(event.action)} className="shrink-0">
                        {event.action.split("_")[0]}
                      </Badge>
                      <span className="text-xs text-zinc-600 shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatEventTime(event.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <Link href="/admin/users">
            <Card className="p-5 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-200 cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                    Gestión de Usuarios
                  </h3>
                  <p className="text-xs text-zinc-500">Gestioná usuarios, roles y permisos</p>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Card>
          </Link>
          <Link href="/chat">
            <Card className="p-5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-200 cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    Asistente de Chat
                  </h3>
                  <p className="text-xs text-zinc-500">Ir a la interfaz de chat con IA</p>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
