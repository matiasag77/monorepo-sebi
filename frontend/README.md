# SEBI Chatbot — Frontend (Next.js)

Interfaz web del chatbot analítico **SEBI**. Construido con Next.js 16, React 19 y Tailwind CSS. Incluye autenticación con NextAuth, chat con IA, historial de conversaciones y panel de administración.

## Arquitectura

```
app/
├── login/                    # Página de login
└── (authenticated)/          # Rutas protegidas
    ├── chat/                 # Chat principal con el agente IA
    ├── history/              # Historial de conversaciones
    ├── admin/                # Dashboard de administración
    ├── admin/users/          # Gestión de usuarios
    └── admin/suggestions/    # Gestión de sugerencias

components/                   # Componentes React reutilizables
hooks/                        # Custom hooks (useAuth, etc.)
lib/
├── auth.ts                   # Configuración NextAuth (Google + Credentials)
├── api.ts                    # Cliente API con gestión de tokens
└── utils.ts                  # Utilidades (cn, etc.)
types/                        # Interfaces TypeScript
middleware.ts                 # Protección de rutas y redirecciones
```

## Requisitos

- Node.js >= 20
- Backend SEBI corriendo (default: `http://localhost:3333`)

## Instalación

```bash
cd frontend
npm install
cp .env.example .env   # Editar con tus valores
```

## Desarrollo

```bash
npm run dev
```

La app estará disponible en `http://localhost:3000`.

## Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `NEXT_PUBLIC_API_URL` | URL de la API backend (ej: `http://localhost:3333/api`) | Si |
| `NEXTAUTH_SECRET` | Secreto para NextAuth sessions | Si |
| `AUTH_SECRET` | Alias de NEXTAUTH_SECRET | Si |
| `NEXTAUTH_URL` | URL base del frontend (ej: `http://localhost:3000`) | Si |
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth | Si |
| `GOOGLE_CLIENT_SECRET` | Client Secret de Google OAuth | Si |

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo con hot reload |
| `npm run build` | Compilar para producción |
| `npm run start` | Iniciar build de producción |
| `npm run lint` | Linter (ESLint) |

## Autenticación

Se usa **NextAuth v5** con dos providers:

1. **Google OAuth**: login con cuenta Google (dominio @forus.cl).
2. **Credentials**: login con email y password via el backend.

El middleware protege automáticamente las rutas:

- `/login` y `/api/auth` son públicas.
- Rutas `/admin/*` requieren rol `admin`.
- Todas las demás rutas requieren sesión activa.

## Funcionalidades

- **Chat con IA**: interfaz de chat con soporte para tablas, gráficos, contexto y pasos intermedios.
- **Historial**: visualización y gestión de conversaciones pasadas.
- **Sugerencias**: mensajes sugeridos configurables desde el admin.
- **Panel admin**: gestión de usuarios y sugerencias.
- **Markdown**: respuestas del agente renderizadas con react-markdown y GFM.
