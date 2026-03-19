"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Send,
  Bot,
  User as UserIcon,
  Loader2,
  ArrowDown,
  Clock,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import DynamicTable from "@/components/sebi/DynamicTable"

// ---------------------------------------------------------------------------
// Dummy data
// ---------------------------------------------------------------------------

const DUMMY_TABLES: Record<string, unknown>[] = [
  { region: "Norte", ventas: 1540320, clientes: 342, crecimiento: 12.5 },
  { region: "Centro", ventas: 2890150, clientes: 567, crecimiento: 8.3 },
  { region: "Sur", ventas: 980400, clientes: 198, crecimiento: -2.1 },
  { region: "Oriente", ventas: 1230780, clientes: 275, crecimiento: 15.7 },
]

interface Message {
  text: string
  sender: "user" | "bot"
  tables?: Record<string, unknown>[]
  intermediateSteps?: string[]
  confidence?: number
  context?: string | null
  sources?: string[]
  followUpQuestions?: string[]
  sentAt: string
  receivedAt?: string
}

const DUMMY_MESSAGES: Message[] = [
  {
    text: "Hola, quiero ver las ventas del ultimo trimestre por region",
    sender: "user",
    sentAt: new Date(Date.now() - 120000).toISOString(),
  },
  {
    text: `## Reporte de Ventas Q4 2025\n\nAqui tienes el desglose de ventas por region para el ultimo trimestre:\n\n- **Norte** presento un crecimiento del **12.5%** respecto al trimestre anterior.\n- **Centro** sigue siendo la region lider con **$2,890,150** en ventas.\n- **Sur** tuvo una leve caida del **-2.1%**, se recomienda analizar los factores.\n- **Oriente** fue la region con mayor crecimiento: **15.7%**.\n\n> El total acumulado del trimestre fue de **$6,641,650**, superando la meta en un 4.2%.`,
    sender: "bot",
    tables: DUMMY_TABLES,
    intermediateSteps: [
      "Ejecutando: CALL_FLASH_REPORT...",
      "Ejecutando: QUERY_BIGQUERY...",
      "Ejecutando: GENERATE_SUMMARY...",
    ],
    confidence: 0.92,
    context: "Datos extraidos de BigQuery - dataset ventas_cl",
    sources: ["BigQuery: ventas_q4_2025", "CRM: pipeline_report"],
    followUpQuestions: [
      "Cual fue la region con mas clientes nuevos?",
      "Comparar con Q3 2025",
      "Desglose por vendedor",
    ],
    sentAt: new Date(Date.now() - 120000).toISOString(),
    receivedAt: new Date(Date.now() - 105000).toISOString(),
  },
  {
    text: "Hay alguna anomalia en los datos?",
    sender: "user",
    sentAt: new Date(Date.now() - 60000).toISOString(),
  },
  {
    text: `### Analisis de Anomalias\n\nSe detectaron **2 anomalias** en los datos del Q4:\n\n1. **Region Sur - Caida atipica**: La disminucion del -2.1% rompe la tendencia positiva de los ultimos 3 trimestres. Posible causa: rotacion del equipo comercial en octubre.\n\n2. **Region Oriente - Spike inusual**: El crecimiento del 15.7% es significativamente mayor al promedio historico (6-8%). Coincide con la apertura de 3 nuevos puntos de venta.\n\n\`\`\`\nAnomaly Score:\n  Sur:     0.78 (ALTO)\n  Oriente: 0.65 (MEDIO)\n  Norte:   0.12 (BAJO)\n  Centro:  0.08 (BAJO)\n\`\`\`\n\nSe recomienda revisar el pipeline de la Region Sur con el equipo comercial.`,
    sender: "bot",
    intermediateSteps: [
      "Ejecutando: ANOMALY_DETECTION...",
      "Ejecutando: HISTORICAL_COMPARISON...",
    ],
    confidence: 0.85,
    sources: ["BigQuery: anomaly_model_v2"],
    followUpQuestions: [
      "Ver detalle de la Region Sur",
      "Cuantos vendedores rotaron?",
      "Forecast del proximo trimestre",
    ],
    sentAt: new Date(Date.now() - 60000).toISOString(),
    receivedAt: new Date(Date.now() - 48000).toISOString(),
  },
]

// ---------------------------------------------------------------------------
// Sub-components (same as WebRunSebi)
// ---------------------------------------------------------------------------

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function MarkdownContent({ content }: { content: string }) {
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
          <ol className="list-decimal list-inside space-y-1 mb-2">
            {children}
          </ol>
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
            <table className="min-w-full text-xs border-collapse">
              {children}
            </table>
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
}

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

function Timestamp({
  sentAt,
  receivedAt,
  isUser,
}: {
  sentAt: string
  receivedAt?: string
  isUser: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 mt-1 text-[10px] text-zinc-500",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <Clock className="w-3 h-3" />
      <span>
        {isUser
          ? `Enviado ${formatTime(sentAt)}`
          : `Recibido ${formatTime(receivedAt || sentAt)}`}
      </span>
    </div>
  )
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const color =
    pct >= 80
      ? "text-green-400 border-green-500/20 bg-green-500/10"
      : pct >= 50
        ? "text-amber-400 border-amber-500/20 bg-amber-500/10"
        : "text-red-400 border-red-500/20 bg-red-500/10"
  return (
    <span
      className={cn(
        "text-[10px] px-2 py-0.5 rounded-full border inline-flex items-center gap-1",
        color
      )}
    >
      Confianza: {pct}%
    </span>
  )
}

function SourcesList({ sources }: { sources: string[] }) {
  if (!sources || sources.length === 0) return null
  return (
    <div className="mt-2 text-[11px] text-zinc-500">
      <span className="font-semibold text-zinc-400">Fuentes: </span>
      {sources.join(" | ")}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <Avatar className="w-8 h-8 shrink-0 mt-1">
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs">
          <Bot className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      <div className="glass rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span className="text-xs text-zinc-400">Analizando...</span>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  onFollowUp,
}: {
  message: Message
  onFollowUp: (text: string) => void
}) {
  const isUser = message.sender === "user"

  return (
    <div className="animate-fade-in-up">
      <div
        className={cn(
          "flex items-start gap-3",
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
            {isUser ? (
              <UserIcon className="w-4 h-4" />
            ) : (
              <Bot className="w-4 h-4" />
            )}
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
            message.text
          ) : (
            <>
              {message.intermediateSteps && (
                <IntermediateSteps steps={message.intermediateSteps} />
              )}
              <MarkdownContent content={message.text} />

              {message.tables && message.tables.length > 0 && (
                <DynamicTable data={message.tables} />
              )}

              <div className="flex flex-wrap items-center gap-2 mt-2">
                {message.confidence != null && message.confidence < 1 && (
                  <ConfidenceBadge confidence={message.confidence} />
                )}
              </div>

              <SourcesList sources={message.sources || []} />

              {(message.followUpQuestions || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-zinc-700/50">
                  {message.followUpQuestions!.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => onFollowUp(q)}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className={cn("px-11", isUser ? "text-right" : "text-left")}>
        <Timestamp
          sentAt={message.sentAt}
          receivedAt={message.receivedAt}
          isUser={isUser}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Demo Page
// ---------------------------------------------------------------------------

export default function DemoSebiPage() {
  const [messages, setMessages] = useState<Message[]>(DUMMY_MESSAGES)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showScrollDown, setShowScrollDown] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    setShowScrollDown(!isNearBottom && messages.length > 0)
  }, [messages.length])

  // Simulated send with dummy response
  const handleSend = async (messageText?: string) => {
    const text = (messageText || input).trim()
    if (!text || isLoading) return

    setInput("")

    const userMessage: Message = {
      text,
      sender: "user",
      sentAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // Simulate API delay
    await new Promise((r) => setTimeout(r, 2500))

    const botMessage: Message = {
      text: `Recibido: **"${text}"**\n\nEsta es una respuesta simulada. En produccion, este mensaje seria generado por el agente SEBI a traves de la API ADK.\n\n- El componente soporta **Markdown** completo\n- Las tablas se generan dinamicamente\n- Los chips de follow-up son interactivos`,
      sender: "bot",
      tables: [
        { metrica: "Consultas hoy", valor: 142, variacion: 5.2 },
        { metrica: "Tiempo promedio", valor: 3.4, variacion: -1.1 },
        { metrica: "Satisfaccion", valor: 94, variacion: 2.0 },
      ],
      intermediateSteps: ["Ejecutando: PROCESS_QUERY...", "Ejecutando: GENERATE_RESPONSE..."],
      confidence: 0.88,
      sources: ["Demo Data"],
      followUpQuestions: [
        "Dame mas detalles",
        "Exportar datos",
      ],
      sentAt: userMessage.sentAt,
      receivedAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, botMessage])
    setIsLoading(false)
    inputRef.current?.focus()
  }

  const handleFollowUp = (text: string) => {
    setInput(text)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white">SEBI Demo</h1>
          <p className="text-[11px] text-zinc-500">Vista previa con datos dummy</p>
        </div>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          DEMO MODE
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 relative overflow-hidden">
        <ScrollArea ref={scrollRef} className="h-full" onScroll={handleScroll}>
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.map((msg, i) => (
              <MessageBubble
                key={`${msg.sentAt}-${i}`}
                message={msg}
                onFollowUp={handleFollowUp}
              />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {showScrollDown && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all shadow-lg animate-fade-in"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800/50 bg-background/80 backdrop-blur-sm p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 p-1.5 rounded-xl glass-strong">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje (demo)..."
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
            Modo demo - las respuestas son simuladas
          </p>
        </div>
      </div>
    </div>
  )
}
