"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Users,
  Search,
  Plus,
  MoreVertical,
  Shield,
  ShieldOff,
  Trash2,
  UserCheck,
  UserX,
  Loader2,
  Mail,
  Clock,
  Lock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import * as api from "@/lib/api"

interface UserItem {
  _id: string
  email: string
  name: string
  role: string
  provider: string
  isActive: boolean
  lastLoginAt?: string
  loginCount: number
  createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Delete dialog
  const [deleteUser, setDeleteUser] = useState<UserItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Register dialog
  const [showRegister, setShowRegister] = useState(false)
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
  })
  const [isRegistering, setIsRegistering] = useState(false)
  const [registerError, setRegisterError] = useState("")

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.getUsers()
      setUsers(data)
    } catch {
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  // Filter
  useEffect(() => {
    if (!search.trim()) {
      setFilteredUsers(users)
    } else {
      const q = search.toLowerCase()
      setFilteredUsers(
        users.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.role.toLowerCase().includes(q)
        )
      )
    }
  }, [search, users])

  const handleToggleActive = async (user: UserItem) => {
    setActionLoading(user._id)
    try {
      await api.updateUser(user._id, { isActive: !user.isActive })
      setUsers((prev) =>
        prev.map((u) =>
          u._id === user._id ? { ...u, isActive: !u.isActive } : u
        )
      )
    } catch {
      // silently fail
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleRole = async (user: UserItem) => {
    const newRole = user.role === "admin" ? "user" : "admin"
    setActionLoading(user._id)
    try {
      await api.updateUser(user._id, { role: newRole })
      setUsers((prev) =>
        prev.map((u) =>
          u._id === user._id ? { ...u, role: newRole } : u
        )
      )
    } catch {
      // silently fail
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteUser) return
    setIsDeleting(true)
    try {
      await api.deleteUser(deleteUser._id)
      setUsers((prev) => prev.filter((u) => u._id !== deleteUser._id))
    } catch {
      // silently fail
    } finally {
      setIsDeleting(false)
      setDeleteUser(null)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegisterError("")
    setIsRegistering(true)
    try {
      await api.registerUser(registerForm)
      setShowRegister(false)
      setRegisterForm({ name: "", email: "", password: "", role: "user" })
      loadUsers()
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setIsRegistering(false)
    }
  }

  const formatDate = (date?: string) => {
    if (!date) return "Nunca"
    return new Date(date).toLocaleDateString("es-CL", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Users className="w-6 h-6 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">Gestión de Usuarios</h1>
            </div>
            <p className="text-sm text-zinc-400 ml-9">
              Gestiona cuentas de usuario, roles y permisos
            </p>
          </div>
          <Button onClick={() => setShowRegister(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Agregar Usuario
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar usuarios..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Desktop Table */}
        {isLoading ? (
          <Card className="hidden md:block overflow-hidden">
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-md" />
                  <Skeleton className="h-6 w-16 rounded-md" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-1">
              {search ? "Sin usuarios encontrados" : "Sin usuarios aún"}
            </h3>
            <p className="text-sm text-zinc-400">
              {search ? "Intenta ajustar tu búsqueda" : "Agrega tu primer usuario para comenzar"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table view */}
            <Card className="hidden md:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                        Usuario
                      </th>
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                        Rol
                      </th>
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                        Proveedor
                      </th>
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                        Estado
                      </th>
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                        Último acceso
                      </th>
                      <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user._id}
                        className="hover:bg-zinc-800/30 transition-colors group"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-9 h-9">
                              <AvatarFallback className="bg-zinc-800 text-xs">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-white">
                                {user.name}
                              </p>
                              <p className="text-xs text-zinc-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={user.role === "admin" ? "default" : "secondary"}
                          >
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-zinc-400 capitalize">
                            {user.provider}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={user.isActive ? "success" : "destructive"}
                          >
                            {user.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-zinc-500">
                            {formatDate(user.lastLoginAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="p-1.5 rounded-md hover:bg-zinc-800 transition-colors">
                              {actionLoading === user._id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                              ) : (
                                <MoreVertical className="w-4 h-4 text-zinc-400" />
                              )}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleToggleRole(user)}>
                                {user.role === "admin" ? (
                                  <>
                                    <ShieldOff className="w-4 h-4 mr-2" />
                                    Quitar Admin
                                  </>
                                ) : (
                                  <>
                                    <Shield className="w-4 h-4 mr-2" />
                                    Hacer Admin
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                                {user.isActive ? (
                                  <>
                                    <UserX className="w-4 h-4 mr-2" />
                                    Desactivar
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-4 h-4 mr-2" />
                                    Activar
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-400 hover:!text-red-300"
                                onClick={() => setDeleteUser(user)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar Usuario
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile card view */}
            <div className="md:hidden space-y-3">
              {filteredUsers.map((user) => (
                <Card key={user._id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-zinc-800 text-xs">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-white">{user.name}</p>
                        <p className="text-xs text-zinc-500">{user.email}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-1.5 rounded-md hover:bg-zinc-800">
                        {actionLoading === user._id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                        ) : (
                          <MoreVertical className="w-4 h-4 text-zinc-400" />
                        )}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleToggleRole(user)}>
                          {user.role === "admin" ? (
                            <>
                              <ShieldOff className="w-4 h-4 mr-2" />
                              Remove Admin
                            </>
                          ) : (
                            <>
                              <Shield className="w-4 h-4 mr-2" />
                              Make Admin
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                          {user.isActive ? (
                            <>
                              <UserX className="w-4 h-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-400 hover:!text-red-300"
                          onClick={() => setDeleteUser(user)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                    <Badge variant={user.isActive ? "success" : "destructive"}>
                      {user.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                    <span className="text-xs text-zinc-600 capitalize">{user.provider}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-zinc-600">
                    <Clock className="w-3 h-3" />
                    Último acceso: {formatDate(user.lastLoginAt)}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Summary */}
        {!isLoading && filteredUsers.length > 0 && (
          <p className="text-xs text-zinc-600 mt-4">
            Mostrando {filteredUsers.length} de {users.length} usuarios
          </p>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Usuario</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar a <strong>{deleteUser?.name}</strong> ({deleteUser?.email})? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>
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
                "Eliminar Usuario"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Register Dialog */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Crea una nueva cuenta de usuario con correo electrónico y contraseña.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegister} className="space-y-4">
            {registerError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {registerError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reg-name">Nombre</Label>
              <Input
                id="reg-name"
                value={registerForm.name}
                onChange={(e) =>
                  setRegisterForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Nombre completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="reg-email"
                  type="email"
                  className="pl-10"
                  value={registerForm.email}
                  onChange={(e) =>
                    setRegisterForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="user@example.com"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="reg-password"
                  type="password"
                  className="pl-10"
                  value={registerForm.password}
                  onChange={(e) =>
                    setRegisterForm((f) => ({ ...f, password: e.target.value }))
                  }
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-role">Rol</Label>
              <select
                id="reg-role"
                value={registerForm.role}
                onChange={(e) =>
                  setRegisterForm((f) => ({ ...f, role: e.target.value }))
                }
                className="flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <option value="user">Usuario</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRegister(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isRegistering}>
                {isRegistering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear Usuario"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
