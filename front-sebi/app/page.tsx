"use client";

import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#09090B",
  bgCard: "#111113",
  bgHover: "#1A1A1F",
  bgInput: "#18181B",
  border: "#27272A",
  borderLight: "#3F3F46",
  text: "#FAFAFA",
  textMuted: "#71717A",
  textSecondary: "#A1A1AA",
  accent: "#E4E4E7",
  accentBlue: "#3B82F6",
  accentBlueMuted: "rgba(59,130,246,0.12)",
  success: "#22C55E",
  successMuted: "rgba(34,197,94,0.12)",
};

const FONTS = {
  // Ahora usamos las variables inyectadas por Next.js en el layout
  sans: "var(--font-dm-sans), sans-serif",
  mono: "var(--font-jetbrains-mono), monospace",
};

// Mock data
const CONVERSATIONS = [
  { id: 1, title: "Análisis ventas Q4 2025", lastMessage: "Las ventas del Q4 muestran un crecimiento del 12% respecto al trimestre anterior...", time: "Hace 5 min", unread: true, icon: "📊" },
  { id: 2, title: "KPIs equipo comercial", lastMessage: "Los principales indicadores están dentro del rango esperado, excepto...", time: "Hace 2h", unread: false, icon: "📈" },
  { id: 3, title: "Anomalía en dataset clientes", lastMessage: "Detecté registros duplicados en la tabla de clientes de la región sur...", time: "Ayer", unread: false, icon: "⚠️" },
  { id: 4, title: "Forecast revenue 2026", lastMessage: "Basado en los datos históricos y tendencias actuales, el forecast...", time: "Ayer", unread: false, icon: "🔮" },
  { id: 5, title: "Reporte churn mensual", lastMessage: "El churn rate de febrero fue 3.2%, una mejora respecto al 3.8%...", time: "Mar 2", unread: false, icon: "📉" },
  { id: 6, title: "Pipeline de datos BigQuery", lastMessage: "El pipeline de ingesta completó sin errores. Procesados 2.4M registros...", time: "Mar 1", unread: false, icon: "⚙️" },
];

const CHAT_MESSAGES = [
  { id: 1, role: "user", text: "¿Cómo estuvieron las ventas del Q4 2025 comparado con Q3?" },
  { id: 2, role: "assistant", text: "Las ventas del Q4 2025 alcanzaron **$4.2M**, lo que representa un crecimiento del **12.3%** respecto al Q3 ($3.74M).\n\nLos principales drivers fueron:\n\n• **Región Norte** → +18% ($1.8M)\n• **Región Centro** → +9% ($1.4M)\n• **Región Sur** → +7% ($1.0M)\n\nEl producto con mayor crecimiento fue la línea Enterprise (+22%)." },
  { id: 3, role: "user", text: "¿Cuál fue el margen operativo?" },
  { id: 4, role: "assistant", text: "El margen operativo del Q4 fue **23.4%**, una mejora de 1.2pp versus Q3 (22.2%).\n\nEsto se debe principalmente a la optimización en costos logísticos (-8%) y el mix de productos favoreciendo la línea Enterprise que tiene un margen bruto del 45%." },
];

function RichText({ text }: { text: string }) {
  const parts = text.split("\n");
  return (
    <div>
      {parts.map((line, i) => {
        if (line.startsWith("• ")) {
          const content = line.slice(2);
          return (
            <div key={i} style={{ display: "flex", gap: 8, paddingLeft: 4, marginBottom: 4 }}>
              <span style={{ color: COLORS.textMuted, fontSize: 8, marginTop: 7 }}>●</span>
              <span>{renderBold(content)}</span>
            </div>
          );
        }
        if (line === "") return <div key={i} style={{ height: 10 }} />;
        return <div key={i} style={{ marginBottom: 4 }}>{renderBold(line)}</div>;
      })}
    </div>
  );
}

function renderBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} style={{ fontWeight: 600, color: COLORS.text }}>{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// Icons
function IconSearch() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>); }
function IconPlus() { return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.text} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>); }
function IconBack() { return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.text} strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>); }
function IconSend() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>); }
function IconMore() { return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.textMuted} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="1" fill={COLORS.textMuted} /><circle cx="12" cy="5" r="1" fill={COLORS.textMuted} /><circle cx="12" cy="19" r="1" fill={COLORS.textMuted} /></svg>); }
function IconBot() {
  return (
    <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.accentBlue}, #8B5CF6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
      ✦
    </div>
  );
}

function PhoneFrame({ children, label }: { children: React.ReactNode, label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ width: 375, height: 812, borderRadius: 44, border: `2px solid ${COLORS.border}`, background: COLORS.bg, overflow: "hidden", position: "relative", boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)" }}>
        <div style={{ height: 54, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: "0 28px 8px", fontFamily: FONTS.sans, fontSize: 14, fontWeight: 600, color: COLORS.text }}>
          <span>9:41</span>
          <div style={{ width: 126, height: 34, background: COLORS.bg, borderRadius: 20, position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)" }} />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 1.5, alignItems: "flex-end" }}>
              {[6, 9, 12, 15].map((h, i) => (<div key={i} style={{ width: 3, height: h, background: COLORS.text, borderRadius: 1 }} />))}
            </div>
            <span style={{ fontSize: 12 }}>5G</span>
            <div style={{ width: 25, height: 12, borderRadius: 3, border: `1.5px solid ${COLORS.text}`, position: "relative", display: "flex", alignItems: "center", padding: "0 2px" }}>
              <div style={{ width: "70%", height: 7, background: COLORS.success, borderRadius: 1.5 }} />
            </div>
          </div>
        </div>
        {children}
      </div>
      <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: COLORS.textMuted, letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

function ConversationListScreen({ onSelect }: { onSelect: (conv: any) => void }) {
  const [search, setSearch] = useState("");

  return (
    <div style={{ height: "calc(100% - 54px)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "8px 20px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h1 style={{ fontFamily: FONTS.sans, fontSize: 28, fontWeight: 700, color: COLORS.text, margin: 0, letterSpacing: -0.5 }}>Chats</h1>
          <button style={{ width: 36, height: 36, borderRadius: 10, background: COLORS.bgHover, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <IconPlus />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: COLORS.bgInput, border: `1px solid ${COLORS.border}` }}>
          <IconSearch />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conversaciones..." style={{ background: "none", border: "none", outline: "none", color: COLORS.text, fontFamily: FONTS.sans, fontSize: 15, width: "100%" }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {CONVERSATIONS.filter(c => c.title.toLowerCase().includes(search.toLowerCase())).map((conv) => (
          <div key={conv.id} onClick={() => onSelect(conv)} style={{ display: "flex", gap: 14, padding: "14px 20px", cursor: "pointer", borderBottom: `1px solid ${COLORS.border}08`, transition: "background 0.15s", background: conv.unread ? COLORS.accentBlueMuted : "transparent" }} onMouseEnter={(e) => e.currentTarget.style.background = conv.unread ? COLORS.accentBlueMuted : COLORS.bgHover} onMouseLeave={(e) => e.currentTarget.style.background = conv.unread ? COLORS.accentBlueMuted : "transparent"}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: COLORS.bgHover, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{conv.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontFamily: FONTS.sans, fontSize: 15, fontWeight: conv.unread ? 600 : 500, color: COLORS.text, letterSpacing: -0.2 }}>{conv.title}</span>
                <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.textMuted, flexShrink: 0, marginLeft: 8 }}>{conv.time}</span>
              </div>
              <div style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.lastMessage}</div>
            </div>
            {conv.unread && <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.accentBlue, flexShrink: 0, alignSelf: "center" }} />}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "12px 20px 28px", borderTop: `1px solid ${COLORS.border}`, background: COLORS.bg }}>
        {["Chats", "Explorar", "Ajustes"].map((label, i) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: i === 0 ? COLORS.accentBlue : "transparent", opacity: i === 0 ? 1 : 0.4 }} />
            <span style={{ fontFamily: FONTS.sans, fontSize: 10, color: i === 0 ? COLORS.accentBlue : COLORS.textMuted, fontWeight: i === 0 ? 600 : 400 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatScreen({ conversation, onBack }: { conversation: any, onBack: () => void }) {
  const [messages, setMessages] = useState(CHAT_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg = { id: Date.now(), role: "user", text: input };
    setMessages([...messages, newMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", text: "Buena pregunta. Déjame consultar los datos actualizados en BigQuery y te respondo con el análisis detallado...\n\nSegún los últimos datos disponibles, el indicador muestra una tendencia positiva del **+5.3%** respecto al período anterior." }]);
    }, 2500);
  };

  return (
    <div style={{ height: "calc(100% - 54px)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px 12px", borderBottom: `1px solid ${COLORS.border}` }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><IconBack /></button>
        <IconBot />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FONTS.sans, fontSize: 15, fontWeight: 600, color: COLORS.text, letterSpacing: -0.2 }}>{conversation?.title || "Análisis ventas Q4 2025"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.success }} />
            <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.success }}>Online</span>
          </div>
        </div>
        <button style={{ width: 36, height: 36, borderRadius: 10, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><IconMore /></button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: COLORS.textMuted, background: COLORS.bgHover, border: `1px solid ${COLORS.border}`, padding: "5px 12px", borderRadius: 20, letterSpacing: 0.5, textTransform: "uppercase" }}>✦ Conectado a BigQuery · Vertex AI</div>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: 8, alignItems: "flex-start" }}>
            {msg.role === "assistant" && <IconBot />}
            <div style={{ maxWidth: "78%", padding: "12px 16px", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: msg.role === "user" ? COLORS.accentBlue : COLORS.bgCard, border: msg.role === "user" ? "none" : `1px solid ${COLORS.border}`, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 1.55, color: msg.role === "user" ? "#fff" : COLORS.textSecondary }}>
              {msg.role === "assistant" ? <RichText text={msg.text} /> : msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <IconBot />
            <div style={{ padding: "14px 20px", borderRadius: "18px 18px 18px 4px", background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, display: "flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map(i => (<div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS.textMuted, animation: `bounce 1.4s infinite ${i * 0.2}s` }} />))}
            </div>
          </div>
        )}

        <div ref={messagesEnd} />
      </div>

      <div style={{ padding: "12px 16px 32px", borderTop: `1px solid ${COLORS.border}`, background: COLORS.bg }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, background: COLORS.bgInput, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "6px 6px 6px 16px" }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Pregunta algo..." style={{ flex: 1, background: "none", border: "none", outline: "none", color: COLORS.text, fontFamily: FONTS.sans, fontSize: 15, padding: "8px 0", resize: "none" }} />
          <button onClick={handleSend} style={{ width: 36, height: 36, borderRadius: 10, background: input.trim() ? COLORS.accentBlue : COLORS.bgHover, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: input.trim() ? "pointer" : "default", transition: "all 0.2s", flexShrink: 0 }}><IconSend /></button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState("list");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  const handleSelect = (conv: any) => {
    setSelectedConversation(conv);
    setScreen("chat");
  };

  const handleBack = () => {
    setScreen("list");
    setSelectedConversation(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050506", display: "flex", alignItems: "center", justifyContent: "center", gap: 48, padding: "40px 20px", flexWrap: "wrap" }}>
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        * { box-sizing: border-box; }
        
        ::-webkit-scrollbar { width: 0; }

        input::placeholder { color: ${COLORS.textMuted}; }
      `}</style>

      <div style={{ position: "absolute", top: 40, left: "50%", transform: "translateX(-50%)", textAlign: "center", opacity: animate ? 1 : 0, transition: "opacity 0.8s ease" }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: COLORS.accentBlue, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>Prototipo Mobile</div>
        <h1 style={{ fontFamily: FONTS.sans, fontSize: 20, fontWeight: 700, color: COLORS.text, margin: 0, letterSpacing: -0.5 }}>Data AI Assistant</h1>
        <div style={{ fontFamily: FONTS.sans, fontSize: 13, color: COLORS.textMuted, marginTop: 6 }}>React Native · shadcn style · GCP</div>
      </div>

      <div style={{ opacity: animate ? 1 : 0, transform: animate ? "translateY(0)" : "translateY(24px)", transition: "all 0.6s ease 0.2s", marginTop: 80 }}>
        <PhoneFrame label="Lista de conversaciones">
          <ConversationListScreen onSelect={handleSelect} />
        </PhoneFrame>
      </div>

      <div style={{ opacity: animate ? 1 : 0, transform: animate ? "translateY(0)" : "translateY(24px)", transition: "all 0.6s ease 0.4s", marginTop: 80 }}>
        <PhoneFrame label="Chat con el bot">
          <ChatScreen conversation={CONVERSATIONS[0]} onBack={() => {}} />
        </PhoneFrame>
      </div>
    </div>
  );
}