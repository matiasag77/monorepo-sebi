"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  MessageSquare,
  Trash2,
  Pencil,
  MoreVertical,
  Clock,
  History,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import * as api from "@/lib/api"

interface ConversationItem {
  _id: string
  title: string
  lastMessage: string
  createdAt: string
  updatedAt: string
}

export default function HistoryPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [filteredConversations, setFilteredConversations] = useState<ConversationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const perPage = 12

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Rename dialog
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameTitle, setRenameTitle] = useState("")
  const [isRenaming, setIsRenaming] = useState(false)

  const loadConversations = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.getConversations()
      const sorted = data.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      setConversations(sorted)
    } catch {
      setConversations([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Filter
  useEffect(() => {
    if (!search.trim()) {
      setFilteredConversations(conversations)
    } else {
      const q = search.toLowerCase()
      setFilteredConversations(
        conversations.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.lastMessage?.toLowerCase().includes(q)
        )
      )
    }
    setPage(1)
  }, [search, conversations])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredConversations.length / perPage))
  const paginatedConversations = filteredConversations.slice(
    (page - 1) * perPage,
    page * perPage
  )

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await api.deleteConversation(deleteId)
      setConversations((prev) => prev.filter((c) => c._id !== deleteId))
    } catch {
      // silently fail
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const handleRename = async () => {
    if (!renameId || !renameTitle.trim()) return
    setIsRenaming(true)
    try {
      await api.updateConversation(renameId, { title: renameTitle.trim() })
      setConversations((prev) =>
        prev.map((c) =>
          c._id === renameId ? { ...c, title: renameTitle.trim() } : c
        )
      )
    } catch {
      // silently fail
    } finally {
      setIsRenaming(false)
      setRenameId(null)
    }
  }

  const openConversation = (id: string) => {
    router.push(`/chat?id=${id}`)
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours < 1) return "Ahora mismo"
    if (diffHours < 24) return `hace ${Math.floor(diffHours)}h`
    if (diffHours < 48) return "Ayer"
    return d.toLocaleDateString("es-AR", {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <History className="w-6 h-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Historial de Conversaciones</h1>
        </div>
        <p className="text-sm text-zinc-400 ml-9">
          Explorá y gestioná tus conversaciones anteriores
        </p>
      </div>

      {/* Search */}
      <div className="px-6 pb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversaciones..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-5 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-1/3" />
              </Card>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              {search ? "Sin resultados" : "Sin conversaciones aún"}
            </h3>
            <p className="text-sm text-zinc-400 max-w-sm">
              {search
                ? "Intentá ajustar los términos de búsqueda"
                : "Iniciá un nuevo chat para comenzar tu historial de conversaciones"}
            </p>
            {!search && (
              <Button
                className="mt-4"
                onClick={() => router.push("/chat")}
              >
                Iniciar una conversación
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedConversations.map((conv) => (
                <Card
                  key={conv._id}
                  className="group p-4 cursor-pointer hover:border-zinc-700 hover:bg-zinc-900/80 transition-all duration-200"
                  onClick={() => openConversation(conv._id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white truncate flex-1 group-hover:text-blue-400 transition-colors">
                      {conv.title}
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-1 rounded hover:bg-zinc-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4 text-zinc-400" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => {
                            setRenameId(conv._id)
                            setRenameTitle(conv.title)
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Renombrar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-400 hover:!text-red-300"
                          onClick={() => setDeleteId(conv._id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {conv.lastMessage && (
                    <p className="text-xs text-zinc-500 mt-2 line-clamp-2">
                      {conv.lastMessage}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-3 text-[11px] text-zinc-600">
                    <Clock className="w-3 h-3" />
                    {formatDate(conv.updatedAt)}
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-zinc-400">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Conversación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que querés eliminar esta conversación? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameId} onOpenChange={() => setRenameId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renombrar Conversación</DialogTitle>
            <DialogDescription>
              Ingresá un nuevo título para esta conversación.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            placeholder="Título de la conversación"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename()
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameId(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={isRenaming || !renameTitle.trim()}>
              {isRenaming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
