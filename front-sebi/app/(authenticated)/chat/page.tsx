"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import * as api from "@/lib/api"
import type { Message, ChatSuggestion } from "@/types"

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

function renderMessageContent(content: string) {
  const parts = content.split(/(\*\*.*?\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      )
    }
    // Handle bullet points
    const lines = part.split("\n")
    return lines.map((line, j) => {
      const trimmed = line.trim()
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        return (
          <span key={`${i}-${j}`} className="block pl-4 relative before:content-[''] before:absolute before:left-1.5 before:top-[0.6em] before:w-1 before:h-1 before:rounded-full before:bg-zinc-500">
            {trimmed.slice(2)}
            {j < lines.length - 1 && "\n"}
          </span>
        )
      }
      return (
        <span key={`${i}-${j}`}>
          {line}
          {j < lines.length - 1 && "\n"}
        </span>
      )
    })
  })
}

function MessageBubble({ message, isUser }: { message: Message; isUser: boolean }) {
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
          "max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-blue-600 text-white rounded-tr-md"
            : "glass text-zinc-200 rounded-tl-md"
        )}
      >
        {isUser ? message.content : renderMessageContent(message.content)}
      </div>
    </div>
  )
}

function SuggestionChip({
  suggestion,
  onClick,
}: {
  suggestion: ChatSuggestion
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-sm text-zinc-300 hover:text-white hover:border-blue-500/30 transition-all duration-200 text-left group"
    >
      <Sparkles className="w-4 h-4 text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
      <span className="line-clamp-2">{suggestion.text}</span>
    </button>
  )
}

function WelcomeState({
  suggestions,
  onSuggestionClick,
  loadingSuggestions,
}: {
  suggestions: ChatSuggestion[]
  onSuggestionClick: (text: string) => void
  loadingSuggestions: boolean
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25 animate-float">
        <Bot className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">
        How can I help you today?
      </h2>
      <p className="text-zinc-400 text-center mb-8 max-w-md">
        Ask me anything about your data. I can help you analyze, query, and understand your information.
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
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default function ChatPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

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

  // Load suggestions
  useEffect(() => {
    api
      .getSuggestions()
      .then(setSuggestions)
      .catch(() => setSuggestions([]))
      .finally(() => setLoadingSuggestions(false))
  }, [])

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
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      const errorMessage: Message = {
        role: "assistant",
        content:
          "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
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
            {conversationId ? "Conversation" : "New Chat"}
          </h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewConversation}
          className="text-zinc-400 hover:text-white"
        >
          <Plus className="w-4 h-4 mr-1" />
          New
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
              <button
                key={s.id}
                onClick={() => handleSend(s.text)}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
              >
                {s.text.length > 40 ? s.text.slice(0, 40) + "..." : s.text}
              </button>
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
              placeholder="Type your message..."
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
            AI can make mistakes. Consider verifying important information.
          </p>
        </div>
      </div>
    </div>
  )
}
