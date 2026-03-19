"use client"

import { useState, useEffect, useRef, useCallback, memo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"
import {
  Send,
  Plus,
  Bot,
  User as UserIcon,
  Sparkles,
  Loader2,
  MessageSquare,
  ArrowDown,
  AlertTriangle,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import * as api from "@/lib/api"
import type { Message, ChatSuggestion } from "@/types"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <Avatar className="w-8 h-8 shrink-0 mt-1">
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs">
          <Bot className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      <div className="glass rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-400 typing-dot" />
          <div className="w-2 h-2 rounded-full bg-blue-400 typing-dot" />
          <div className="w-2 h-2 rounded-full bg-blue-400 typing-dot" />
        </div>
      </div>
    </div>
  )
}

const MarkdownContent = memo(function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => (
          <strong className="font-semibold text-white">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        h1: ({ children }) => (
          <h1 className="text-lg font-bold text-white mb-2">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold text-white mb-2">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-bold text-white mb-1">{children}</h3>
        ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>
        ),
        li: ({ children }) => <li className="text-zinc-200">{children}</li>,
        code: ({ className, children, ...props }) => {
          const isBlock = className?.includes("language-")
          if (isBlock) {
            return (
              <code
                className="block bg-zinc-900/80 rounded-lg p-3 my-2 text-xs overflow-x-auto text-zinc-200 font-mono"
                {...props}
              >
                {children}
              </code>
            )
          }
          return (
            <code
              className="bg-zinc-800 rounded px-1.5 py-0.5 text-xs text-blue-300 font-mono"
              {...props}
            >
              {children}
            </code>
          )
        },
        pre: ({ children }) => <pre className="my-2">{children}</pre>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-blue-500/50 pl-3 my-2 text-zinc-400 italic">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
          >
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full text-xs border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-left text-white font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-zinc-700 px-3 py-1.5 text-zinc-300">
            {children}
          </td>
        ),
        hr: () => <hr className="border-zinc-700 my-3" />,
      }}
    >
      {content}
    </ReactMarkdown>
  )
})

const DynamicTable = memo(function DynamicTable({ data }: { data: Record<string, unknown>[] }) {
  if (!data || data.length === 0) return null
  const headers = Object.keys(data[0])

  return (
    <div className="overflow-x-auto my-3 rounded-lg border border-zinc-700">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-zinc-800/80">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left text-zinc-300 font-semibold border-b border-zinc-700 capitalize">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-zinc-900/40" : "bg-zinc-900/20"}>
              {headers.map((h) => (
                <td key={h} className="px-3 py-2 text-zinc-300 border-b border-zinc-800">
                  {Array.isArray(row[h])
                    ? (row[h] as string[]).join(", ")
                    : String(row[h] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})

function IntermediateSteps({ steps }: { steps: string[] }) {
  if (!steps || steps.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mb-2">
      {steps.map((step, i) => (
        <span
          key={i}
          className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
        >
          {step}
        </span>
      ))}
    </div>
  )
}

function ProactiveSuggestion({ text }: { text: string }) {
  return (
    <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border-l-2 border-amber-500/60 text-amber-200 text-xs">
      <span className="font-semibold text-amber-400">Sugerencia: </span>
      {text}
    </div>
  )
}

function AdkErrorBanner({ error }: { error: string }) {
  return (
    <div className="mb-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
      <div>
        <span className="font-semibold text-red-400">Error en ADK: </span>
        <span>{error}</span>
        <p className="mt-1 text-red-400/70">Se utilizó el servicio de respaldo para responder tu consulta.</p>
      </div>
    </div>
  )
}

const MessageBubble = memo(function MessageBubble({ message, isUser }: { message: Message; isUser: boolean }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 animate-fade-in-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className="w-8 h-8 shrink-0 mt-1">
        <AvatarFallback
          className={cn(
            "text-xs",
            isUser
              ? "bg-zinc-700 text-zinc-300"
              : "bg-gradient-to-br from-blue-500 to-blue-700 text-white"
          )}
        >
          {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-blue-600 text-white rounded-tr-md whitespace-pre-wrap"
            : "glass text-zinc-200 rounded-tl-md"
        )}
      >
        {isUser ? (
          message.content
        ) : (
          <>
            {message.fallbackUsed && message.adkError && (
              <AdkErrorBanner error={message.adkError} />
            )}
            {message.intermediateSteps && (
              <IntermediateSteps steps={message.intermediateSteps} />
            )}
            <MarkdownContent content={message.content} />
            {message.table && <DynamicTable data={message.table} />}
            {message.proactivo && <ProactiveSuggestion text={message.proactivo} />}
          </>
        )}
      </div>
    </div>
  )
})

function SuggestionChip({
  suggestion,
  onClick,
  onDelete,
}: {
  suggestion: ChatSuggestion
  onClick: () => void
  onDelete?: () => void
}) {
  return (
    <div className="relative group/chip">
      <button
        onClick={onClick}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-sm text-zinc-300 hover:text-white hover:border-blue-500/30 transition-all duration-200 text-left group w-full"
      >
        <Sparkles className="w-4 h-4 text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
        <span className="line-clamp-2 pr-4">{suggestion.text}</span>
      </button>
      {onDelete && !suggestion.isDefault && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:border-red-500/30 opacity-0 group-hover/chip:opacity-100 transition-all"
          title="Eliminar sugerencia"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

function WelcomeState({
  suggestions,
  onSuggestionClick,
  onSuggestionDelete,
  loadingSuggestions,
}: {
  suggestions: ChatSuggestion[]
  onSuggestionClick: (text: string) => void
  onSuggestionDelete: (id: string) => void
  loadingSuggestions: boolean
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25 animate-float">
        <Bot className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">
        ¿En qué puedo ayudarte hoy?
      </h2>
      <p className="text-zinc-400 text-center mb-8 max-w-md">
        Consulta lo que necesites sobre tus datos.
      </p>

      {loadingSuggestions ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : suggestions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
          {suggestions.map((s) => (
            <SuggestionChip
              key={s.id}
              suggestion={s}
              onClick={() => onSuggestionClick(s.text)}
              onDelete={() => onSuggestionDelete(s.id)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ChatPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [showScrollDown, setShowScrollDown] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load conversation from URL param
  useEffect(() => {
    const id = searchParams.get("id")
    if (id && id !== conversationId) {
      setLoadingConversation(true)
      setConversationId(id)
      api
        .getConversation(id)
        .then((conv) => {
          setMessages(
            conv.messages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
              timestamp: m.timestamp,
            }))
          )
        })
        .catch(() => {
          setMessages([])
          setConversationId(null)
        })
        .finally(() => setLoadingConversation(false))
    }
  }, [searchParams, conversationId])

  // Load suggestions only once the user is authenticated (token is ready)
  useEffect(() => {
    if (!isAuthenticated) return
    api
      .getSuggestions()
      .then(setSuggestions)
      .catch(() => setSuggestions([]))
      .finally(() => setLoadingSuggestions(false))
  }, [isAuthenticated])

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  // Detect scroll position for scroll-down button
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    setShowScrollDown(!isNearBottom && messages.length > 0)
  }, [messages.length])

  const handleSend = async (messageText?: string) => {
    const text = (messageText || input).trim()
    if (!text || isLoading) return

    setInput("")

    const userMessage: Message = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Create conversation if none exists
      let currentConvId = conversationId
      if (!currentConvId) {
        const conv = await api.createConversation(
          text.slice(0, 50) + (text.length > 50 ? "..." : "")
        )
        currentConvId = conv._id
        setConversationId(currentConvId)
        router.replace(`/chat?id=${currentConvId}`, { scroll: false })
      }

      const response = await api.sendMessage(currentConvId, text)

      const assistantMessage: Message = {
        role: "assistant",
        content: response.assistantMessage.content,
        timestamp: response.assistantMessage.timestamp,
        table: response.table,
        chart: response.chart,
        proactivo: response.proactivo,
        context: response.context,
        intermediateSteps: response.intermediateSteps,
        fallbackUsed: response.fallbackUsed,
        adkError: response.adkError,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      const errorMessage: Message = {
        role: "assistant",
        content:
          "Ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo.",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleDeleteSuggestion = async (id: string) => {
    try {
      await api.deleteSuggestion(id)
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
    } catch {
      // silently fail
    }
  }

  const handleNewConversation = () => {
    setMessages([])
    setConversationId(null)
    setInput("")
    router.replace("/chat", { scroll: false })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const showWelcome = messages.length === 0 && !loadingConversation

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50 bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-zinc-400" />
          <h1 className="text-sm font-semibold text-white">
            {conversationId ? "Conversación" : "Nuevo Chat"}
          </h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewConversation}
          className="text-zinc-400 hover:text-white"
        >
          <Plus className="w-4 h-4 mr-1" />
          Nuevo
        </Button>
      </div>

      {/* Messages area */}
      <div className="flex-1 relative overflow-hidden">
        {loadingConversation ? (
          <div className="flex-1 flex flex-col gap-4 p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className={cn("flex gap-3", i % 2 === 0 && "flex-row-reverse")}>
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <Skeleton className={cn("h-16 rounded-2xl", i % 2 === 0 ? "w-48" : "w-64")} />
              </div>
            ))}
          </div>
        ) : showWelcome ? (
          <WelcomeState
            suggestions={suggestions}
            onSuggestionClick={(text) => handleSend(text)}
            onSuggestionDelete={handleDeleteSuggestion}
            loadingSuggestions={loadingSuggestions}
          />
        ) : (
          <ScrollArea
            ref={scrollRef}
            className="h-full"
            onScroll={handleScroll}
          >
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg, i) => (
                <MessageBubble
                  key={`${msg.timestamp}-${i}`}
                  message={msg}
                  isUser={msg.role === "user"}
                />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}

        {/* Scroll to bottom button */}
        {showScrollDown && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all shadow-lg animate-fade-in"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggestion chips (when in active conversation) */}
      {messages.length > 0 && !isLoading && suggestions.length > 0 && (
        <div className="px-4 pb-2 max-w-3xl mx-auto w-full">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {suggestions.slice(0, 3).map((s) => (
              <div key={s.id} className="shrink-0 relative group/inline">
                <button
                  onClick={() => handleSend(s.text)}
                  className="text-xs px-3 py-1.5 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors pr-6"
                >
                  {s.text.length > 40 ? s.text.slice(0, 40) + "..." : s.text}
                </button>
                {!s.isDefault && (
                  <button
                    onClick={() => handleDeleteSuggestion(s.id)}
                    className="absolute top-0 right-0 w-4 h-4 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-red-400 opacity-0 group-hover/inline:opacity-100 transition-all"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-zinc-800/50 bg-background/80 backdrop-blur-sm p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 p-1.5 rounded-xl glass-strong">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje..."
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-white placeholder:text-zinc-500"
              disabled={isLoading}
              autoFocus
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              size="icon"
              className={cn(
                "shrink-0 rounded-lg transition-all duration-200",
                input.trim()
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25"
                  : "bg-zinc-800 text-zinc-500"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-[11px] text-zinc-600 text-center mt-2">
            La IA puede cometer errores. Considera verificar la información importante.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ChatPageWrapper() {
  return (
    <Suspense>
      <ChatPage />
    </Suspense>
  )
}
