"use client";

import { useMemo, useState } from "react";

type Conversation = {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
  tag: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const conversations: Conversation[] = [
  {
    id: "sales-q4",
    title: "Análisis de ventas Q4",
    preview: "¿Qué regiones crecieron más y por qué?",
    timestamp: "Hace 5 min",
    tag: "Ventas",
  },
  {
    id: "churn",
    title: "Reporte churn mensual",
    preview: "Compárame febrero vs enero con insights accionables.",
    timestamp: "Hace 35 min",
    tag: "Retención",
  },
  {
    id: "forecast-2026",
    title: "Forecast revenue 2026",
    preview: "Escenario conservador y agresivo para H1.",
    timestamp: "Ayer",
    tag: "Forecast",
  },
];

const messagesByConversation: Record<string, Message[]> = {
  "sales-q4": [
    { id: "u1", role: "user", content: "¿Cómo cerró Q4 vs Q3?" },
    {
      id: "a1",
      role: "assistant",
      content:
        "Q4 cerró con +12.3% vs Q3. Norte fue la región con mejor desempeño y Enterprise el principal driver.",
    },
  ],
  churn: [
    { id: "u2", role: "user", content: "Resumen del churn de febrero." },
    {
      id: "a2",
      role: "assistant",
      content:
        "El churn bajó de 3.8% a 3.2%. Los segmentos con mayor mejora fueron SMB y Mid-market gracias al nuevo plan de retención.",
    },
  ],
  "forecast-2026": [
    { id: "u3", role: "user", content: "Proyección para 2026 en dos escenarios." },
    {
      id: "a3",
      role: "assistant",
      content:
        "Escenario conservador: +9% YoY. Escenario agresivo: +16% YoY asumiendo expansión en canal partners y upsell enterprise.",
    },
  ],
};

function HistorialPanel({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-lg shadow-black/20">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Historial</p>
          <h2 className="text-lg font-semibold text-zinc-100">Conversaciones</h2>
        </div>
        <button className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm text-zinc-100 hover:bg-zinc-800">
          + Nueva
        </button>
      </div>

      <div className="space-y-2">
        {conversations.map((conv) => {
          const active = conv.id === selectedId;
          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full rounded-lg border p-3 text-left transition ${
                active
                  ? "border-blue-500/60 bg-blue-500/10"
                  : "border-zinc-800 bg-zinc-900/70 hover:bg-zinc-900"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="font-medium text-zinc-100">{conv.title}</p>
                <span className="text-xs text-zinc-400">{conv.timestamp}</span>
              </div>
              <p className="mb-2 line-clamp-1 text-sm text-zinc-400">{conv.preview}</p>
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300">
                {conv.tag}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ChatPanel({ messages }: { messages: Message[] }) {
  const [input, setInput] = useState("");

  return (
    <section className="flex h-full min-h-[500px] flex-col rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-lg shadow-black/20">
      <header className="border-b border-zinc-800 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Chat</p>
        <h2 className="text-lg font-semibold text-zinc-100">Asistente AI</h2>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "rounded-br-md bg-blue-600 text-white"
                  : "rounded-bl-md border border-zinc-800 bg-zinc-900 text-zinc-100"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <footer className="border-t border-zinc-800 p-3">
        <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          <button
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
            onClick={() => setInput("")}
          >
            Enviar
          </button>
        </div>
      </footer>
    </section>
  );
}

export default function Home() {
  const [selectedId, setSelectedId] = useState(conversations[0].id);

  const messages = useMemo(() => messagesByConversation[selectedId] ?? [], [selectedId]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 px-4 py-6 text-zinc-100 md:px-8 md:py-10">
      <div className="mx-auto mb-6 max-w-6xl">
        <p className="text-xs uppercase tracking-[0.3em] text-blue-400">UX/UI · shadcn style</p>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">Frontend IA bonito y responsivo</h1>
        <p className="mt-2 text-sm text-zinc-400 md:text-base">
          Vista de historial y chat lista para conectar al backend de NestJS.
        </p>
      </div>

      <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-[320px_1fr]">
        <HistorialPanel selectedId={selectedId} onSelect={setSelectedId} />
        <ChatPanel messages={messages} />
      </div>
    </main>
  );
}
