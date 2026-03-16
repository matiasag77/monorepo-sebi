# SEBI Frontend - Next.js

Interfaz de usuario del chatbot SEBI. Construida con Next.js 16 y React 19, consume la API BFF y ofrece chat con IA, historial de conversaciones y panel de administracion.

## Indice

- [Requisitos](#requisitos)
- [Instalacion](#instalacion)
- [Configuracion](#configuracion)
- [Ejecucion](#ejecucion)
- [Arquitectura](#arquitectura)
- [Paginas y Rutas](#paginas-y-rutas)
- [Componentes](#componentes)
- [Autenticacion](#autenticacion)
- [Comunicacion con la API](#comunicacion-con-la-api)

---

## Requisitos

- Node.js >= 18
- API BFF en ejecucion (`api-bff-sebi`)
- Credenciales de Google OAuth (las mismas que el backend)

---

## Instalacion

```bash
cd front-sebi
npm install
cp .env.example .env.local
# Editar .env.local con los valores correspondientes
```

---

## Configuracion

Crear el archivo `.env.local` basado en `.env.example`:

```env
# URL del backend BFF
NEXT_PUBLIC_API_URL=http://localhost:3333/api

# NextAuth
NEXTAUTH_SECRET=tu-secreto-seguro
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (mismas credenciales que el backend)
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
```

---

## Ejecucion

```bash
# Desarrollo (hot-reload)
npm run dev

# Build de produccion
npm run build
npm run start

# Linting
npm run lint
```

La aplicacion estara disponible en: `http://localhost:3000`

---

## Arquitectura

```
front-sebi/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Layout raiz (fuentes, providers)
│   ├── page.tsx                  # Pagina de inicio
│   ├── login/
│   │   └── page.tsx              # Pagina de login
│   └── (authenticated)/          # Grupo de rutas protegidas
│       ├── layout.tsx            # Layout con sidebar de navegacion
│       ├── chat/
│       │   └── page.tsx          # Interfaz de chat con IA
│       ├── history/
│       │   └── page.tsx          # Historial de conversaciones
│       └── admin/
│           ├── page.tsx          # Dashboard de administracion
│           └── users/
│               └── page.tsx      # Gestion de usuarios (admin)
├── components/
│   ├── ui/                       # Componentes UI reutilizables
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── avatar.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   └── skeleton.tsx
│   └── providers/
│       └── session-provider.tsx  # Proveedor de sesion NextAuth
├── hooks/
│   └── use-auth.ts               # Hook personalizado de autenticacion
├── lib/
│   ├── api.ts                    # Cliente HTTP para el backend
│   ├── auth.ts                   # Configuracion de NextAuth
│   └── utils.ts                  # Utilidades (cn, etc.)
├── types/
│   └── index.ts                  # Tipos TypeScript globales
├── middleware.ts                  # Middleware de rutas (proteccion auth)
├── .env.example
├── next.config.ts
└── package.json
```

---

## Paginas y Rutas

### Rutas Publicas

| Ruta | Archivo | Descripcion |
|------|---------|-------------|
| `/` | `app/page.tsx` | Pagina de inicio / demo |
| `/login` | `app/login/page.tsx` | Login con email/password o Google OAuth |

### Rutas Protegidas (requieren autenticacion)

| Ruta | Archivo | Roles | Descripcion |
|------|---------|-------|-------------|
| `/chat` | `app/(authenticated)/chat/page.tsx` | user, admin | Interfaz de chat con IA |
| `/history` | `app/(authenticated)/history/page.tsx` | user, admin | Historial de conversaciones |
| `/admin` | `app/(authenticated)/admin/page.tsx` | admin | Dashboard de administracion |
| `/admin/users` | `app/(authenticated)/admin/users/page.tsx` | admin | Gestion de usuarios |

El middleware `middleware.ts` redirige automaticamente a `/login` si el usuario no esta autenticado.

---

## Componentes

### Layout Autenticado (`(authenticated)/layout.tsx`)

Layout compartido para todas las rutas protegidas. Incluye:

- **Sidebar colapsable** (desktop): navegacion lateral con iconos y etiquetas
- **Sidebar en Sheet** (mobile): menu lateral deslizable
- **Navegacion adaptativa**: muestra items de admin solo si el usuario tiene rol `admin`
- **Seccion de usuario**: avatar, nombre, email y boton de logout

**Items de navegacion:**
- Chat (`/chat`) - visible para todos
- Historial (`/history`) - visible para todos
- Dashboard (`/admin`) - solo admin
- Usuarios (`/admin/users`) - solo admin

### Componentes UI (`components/ui/`)

Componentes base reutilizables basados en Radix UI y Tailwind CSS:

| Componente | Descripcion |
|-----------|-------------|
| `Button` | Boton con variantes (default, ghost, outline, etc.) |
| `Input` | Campo de texto estilizado |
| `Card` | Contenedor de tarjeta con header y content |
| `Avatar` | Avatar de usuario con fallback de iniciales |
| `Separator` | Linea separadora horizontal/vertical |
| `Sheet` | Panel deslizable (usado para sidebar mobile) |
| `Skeleton` | Placeholder animado para estados de carga |

---

## Autenticacion

La autenticacion esta implementada con **NextAuth v5** (`next-auth`).

### Proveedores configurados (`lib/auth.ts`):

1. **Credentials** - Login con email y password
   - Llama a `POST /api/auth/login` en el backend
   - Retorna JWT token del backend
   - Soporta auto-registro si el usuario no existe

2. **Google** - OAuth2 con Google
   - Llama a `POST /api/auth/google` en el backend con los datos de Google
   - Auto-crea el usuario en el backend si no existe

### Hook de autenticacion (`hooks/use-auth.ts`)

Hook personalizado que expone el estado de autenticacion en toda la app:

```typescript
const { user, isAdmin, isLoading, logout } = useAuth()

// user: { name, email, image, role, backendToken }
// isAdmin: boolean
// isLoading: boolean
// logout: () => void
```

### Proteccion de rutas

El archivo `middleware.ts` protege automaticamente todas las rutas del grupo `(authenticated)`, redirigiendo a `/login` si no hay sesion activa.

---

## Comunicacion con la API

El archivo `lib/api.ts` contiene el cliente HTTP que se comunica con el backend BFF.

### Funciones principales:

```typescript
// Autenticacion
login(email, password)
loginWithGoogle(googleData)

// Conversaciones
getConversations()
createConversation(title)
getConversation(id)
updateConversation(id, data)
deleteConversation(id)
sendMessage(conversationId, content)

// Chat directo
sendDirectMessage(content)
getSuggestions()

// Usuarios (admin)
getUsers()
updateUser(id, data)
deleteUser(id)
```

Todas las llamadas autenticadas incluyen automaticamente el token JWT del usuario en el header `Authorization: Bearer <token>`.

---

## Variables de Entorno

| Variable | Descripcion | Requerida |
|----------|-------------|-----------|
| `NEXT_PUBLIC_API_URL` | URL de la API BFF | Si |
| `NEXTAUTH_SECRET` | Secreto para firmar sesiones NextAuth | Si |
| `NEXTAUTH_URL` | URL publica del frontend | Si |
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth | Si (para login con Google) |
| `GOOGLE_CLIENT_SECRET` | Client Secret de Google OAuth | Si (para login con Google) |
