"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { Bot, Mail, Lock, Loader2, Eye, EyeOff, Copy, Check } from "lucide-react"
import * as api from "@/lib/api"

function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$"
  let pwd = ""
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pwd
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [autoRegistered, setAutoRegistered] = useState<{ password: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const { loginWithCredentials, loginWithGoogle } = useAuth()

  const handleCopyPassword = () => {
    if (autoRegistered) {
      navigator.clipboard.writeText(autoRegistered.password)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setAutoRegistered(null)
    setIsLoading(true)

    try {
      await loginWithCredentials(email, password)
      router.push("/chat")
    } catch {
      // Login failed — try auto-register if it looks like a new user
      const generatedPassword = generatePassword()
      const namePart = email.split("@")[0].replace(/[._]/g, " ")
      const name = namePart.charAt(0).toUpperCase() + namePart.slice(1)

      try {
        await api.registerPublic({ name, email, password: generatedPassword })
        // Auto-login with the generated password
        await loginWithCredentials(email, generatedPassword)
        setAutoRegistered({ password: generatedPassword })
        router.push("/chat")
      } catch (regErr) {
        const msg = regErr instanceof Error ? regErr.message : ""
        if (msg.toLowerCase().includes("already")) {
          // User exists but password was wrong
          setError("Email o contraseña incorrectos. Por favor, intentá de nuevo.")
        } else {
          setError("No se pudo iniciar sesión. Por favor, intentá de nuevo.")
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    try {
      await loginWithGoogle()
    } catch {
      setError("El inicio de sesión con Google falló. Por favor, intentá de nuevo.")
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-[#09090B]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10 animate-gradient" />
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/8 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo & branding */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 mb-4 shadow-lg shadow-blue-500/25">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Sebi AI</h1>
          <p className="text-zinc-400">Acceder a tu asistente inteligente</p>
        </div>

        {/* Login card */}
        <Card className="glass-strong animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Bienvenido</CardTitle>
            <CardDescription className="text-center">
              Inicia con Google o ingresá tu email para iniciar sesión
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
                  {error}
                </div>
              )}

              {autoRegistered && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm animate-fade-in space-y-2">
                  <p className="font-medium">¡Cuenta creada! Guardá tu contraseña generada:</p>
                  <div className="flex items-center gap-2 bg-zinc-900/60 rounded-md px-3 py-1.5">
                    <code className="flex-1 text-xs font-mono text-zinc-200">{autoRegistered.password}</code>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="text-zinc-400 hover:text-white transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@forus.cl"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ingresá tu contraseña"
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Si eres nuevo, se creará una cuenta automáticamente con el email ingresado.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Ingresar / Registrarse"
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-950 px-2 text-zinc-500">o continuar con</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full h-11"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Continuar con Google
            </Button>

            <p className="mt-6 text-center text-xs text-zinc-500">
              Protegido con encriptación de nivel empresarial
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
