"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  GripVertical,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import * as api from "@/lib/api"

interface DefaultSuggestion {
  id: string
  text: string
  category: string
  isActive: boolean
  order: number
}

export default function AdminSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<DefaultSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Create/Edit dialog
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ text: "", category: "general", order: 0 })
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState("")

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadSuggestions = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.getDefaultSuggestions()
      setSuggestions(data)
    } catch {
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSuggestions()
  }, [loadSuggestions])

  const handleOpenCreate = () => {
    setEditId(null)
    setFormData({ text: "", category: "general", order: suggestions.length })
    setFormError("")
    setShowForm(true)
  }

  const handleOpenEdit = (s: DefaultSuggestion) => {
    setEditId(s.id)
    setFormData({ text: s.text, category: s.category, order: s.order })
    setFormError("")
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.text.trim() || formData.text.length < 5) {
      setFormError("El texto debe tener al menos 5 caracteres")
      return
    }
    setIsSaving(true)
    setFormError("")
    try {
      if (editId) {
        const updated = await api.updateDefaultSuggestion(editId, formData)
        setSuggestions((prev) =>
          prev.map((s) => (s.id === editId ? { ...s, ...updated } : s))
        )
      } else {
        const created = await api.createDefaultSuggestion(formData)
        setSuggestions((prev) => [...prev, { ...created, isActive: true }])
      }
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await api.deleteDefaultSuggestion(deleteId)
      setSuggestions((prev) => prev.filter((s) => s.id !== deleteId))
    } catch {
      // silently fail
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-6 max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Sparkles className="w-6 h-6 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">
                Sugerencias por Defecto
              </h1>
            </div>
            <p className="text-sm text-zinc-400 ml-9">
              Administra las consultas sugeridas que ven todos los usuarios
            </p>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Nueva Sugerencia
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-6 h-6 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              </Card>
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">
              Sin sugerencias configuradas
            </h3>
            <p className="text-sm text-zinc-400 mb-4">
              Agrega sugerencias por defecto para orientar a los usuarios
            </p>
            <Button onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-1" />
              Crear primera sugerencia
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s) => (
              <Card
                key={s.id}
                className={cn(
                  "p-4 hover:border-zinc-700 transition-colors",
                  !s.isActive && "opacity-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-zinc-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{s.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {s.category}
                      </Badge>
                      <span className="text-[10px] text-zinc-600">
                        Orden: {s.order}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-white"
                      onClick={() => handleOpenEdit(s)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-red-400"
                      onClick={() => setDeleteId(s.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && suggestions.length > 0 && (
          <p className="text-xs text-zinc-600 mt-4">
            {suggestions.length} sugerencia{suggestions.length !== 1 ? "s" : ""} configurada{suggestions.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editId ? "Editar Sugerencia" : "Nueva Sugerencia"}
            </DialogTitle>
            <DialogDescription>
              {editId
                ? "Modifica el texto o la configuración de esta sugerencia."
                : "Crea una nueva sugerencia por defecto visible para todos los usuarios."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="suggestion-text">Texto de la sugerencia</Label>
              <Input
                id="suggestion-text"
                value={formData.text}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, text: e.target.value }))
                }
                placeholder="Ej: ¿Cómo estuvieron las ventas del último trimestre?"
                maxLength={200}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="suggestion-category">Categoría</Label>
                <Input
                  id="suggestion-category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, category: e.target.value }))
                  }
                  placeholder="general"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="suggestion-order">Orden</Label>
                <Input
                  id="suggestion-order"
                  type="number"
                  value={formData.order}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      order: parseInt(e.target.value) || 0,
                    }))
                  }
                  min={0}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : editId ? (
                "Guardar Cambios"
              ) : (
                "Crear Sugerencia"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Sugerencia</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta sugerencia por defecto?
              Esta acción no se puede deshacer.
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
    </div>
  )
}
