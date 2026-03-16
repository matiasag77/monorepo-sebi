# SEBI API BFF - Backend NestJS

API Backend-for-Frontend del chatbot SEBI. Construida con NestJS, provee autenticacion, gestion de conversaciones, integracion con IA y analytics.

## Indice

- [Requisitos](#requisitos)
- [Instalacion](#instalacion)
- [Configuracion](#configuracion)
- [Ejecucion](#ejecucion)
- [Arquitectura](#arquitectura)
- [Modulos](#modulos)
- [API Reference](#api-reference)
- [Modelos de Datos](#modelos-de-datos)
- [Tests](#tests)

---

## Requisitos

- Node.js >= 18
- MongoDB >= 6
- Cuenta de Google Cloud (para BigQuery y OAuth)
- Credenciales de la API de Skelligen

---

## Instalacion

```bash
cd api-bff-sebi
npm install
cp .env.example .env
# Editar .env con los valores correspondientes
```

---

## Configuracion

Crear el archivo `.env` basado en `.env.example`:

```env
# Servidor
PORT=3333
FRONTEND_URL=http://localhost:3000

# Base de datos
MONGODB_URI=mongodb://localhost:27017/sebi-chatbot

# JWT
JWT_SECRET=tu-secreto-jwt-seguro

# Google OAuth
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret

# BigQuery (Analytics)
BIGQUERY_PROJECT_ID=tu-proyecto-gcp
BIGQUERY_KEY_FILE=./path-to-service-account-key.json
BIGQUERY_DATASET=sebi_chatbot
BIGQUERY_TABLE=conversation_traces
```

### Configuracion de Google Cloud BigQuery

1. Crear un proyecto en Google Cloud Platform
2. Habilitar la API de BigQuery
3. Crear una cuenta de servicio con rol `BigQuery Data Editor`
4. Descargar el archivo JSON de credenciales
5. Configurar `BIGQUERY_KEY_FILE` con la ruta al archivo

---

## Ejecucion

```bash
# Desarrollo (hot-reload)
npm run start:dev

# Produccion
npm run build
npm run start:prod

# Modo debug
npm run start:debug
```

La API estara disponible en: `http://localhost:3333`
Documentacion Swagger: `http://localhost:3333/api/docs`

---

## Arquitectura

```
api-bff-sebi/
├── src/
│   ├── app.module.ts          # Modulo raiz
│   ├── main.ts                # Entry point (Swagger, CORS, validacion)
│   ├── auth/                  # Autenticacion y autorizacion
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── decorators/        # @Roles()
│   │   ├── dto/               # LoginDto, RegisterDto, GoogleAuthDto
│   │   ├── guards/            # JwtAuthGuard, LocalAuthGuard, RolesGuard
│   │   └── strategies/        # jwt.strategy, local.strategy, google.strategy
│   ├── users/                 # Gestion de usuarios
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   ├── dto/               # UpdateUserDto
│   │   └── schemas/           # user.schema.ts
│   ├── chat/                  # Integracion con IA (Skelligen)
│   │   ├── chat.controller.ts
│   │   ├── chat.service.ts
│   │   ├── chat.module.ts
│   │   └── dto/               # SendMessageDto
│   ├── conversations/         # Historial de conversaciones
│   │   ├── conversations.controller.ts
│   │   ├── conversations.service.ts
│   │   ├── conversations.module.ts
│   │   ├── dto/               # CreateConversationDto, UpdateConversationDto
│   │   └── schemas/           # conversation.schema.ts
│   ├── tracking/              # Tracking de eventos de usuario
│   │   ├── tracking.service.ts
│   │   ├── tracking.module.ts
│   │   └── schemas/           # tracking-event.schema.ts
│   └── bigquery/              # Integracion con Google BigQuery
│       ├── bigquery.service.ts
│       └── bigquery.module.ts
├── test/                      # Tests e2e
├── .env.example
├── nest-cli.json
├── package.json
└── tsconfig.json
```

---

## Modulos

### Auth Module

Maneja toda la autenticacion y autorizacion de la aplicacion.

**Estrategias implementadas:**
- `LocalStrategy` - Autenticacion por email/password con bcrypt
- `JwtStrategy` - Validacion de tokens JWT
- `GoogleStrategy` - OAuth2 con Google

**Guards disponibles:**
- `JwtAuthGuard` - Protege rutas que requieren autenticacion
- `LocalAuthGuard` - Usado en el endpoint de login
- `RolesGuard` - Control de acceso basado en roles

**Roles del sistema:**
- `user` - Usuario estandar, puede chatear y ver su historial
- `admin` - Administrador, acceso completo a gestion de usuarios

---

### Users Module

Gestion de usuarios registrados en MongoDB.

**Schema del usuario:**
```typescript
{
  email: string        // unico, requerido
  password: string     // hasheada con bcrypt
  name: string         // nombre del usuario
  role: 'user' | 'admin'
  googleId?: string    // ID de Google OAuth
  avatar?: string      // URL de avatar
  isActive: boolean    // estado del usuario
  createdAt: Date
  updatedAt: Date
}
```

---

### Chat Module

Integracion con la API externa de IA (Skelligen) para procesar mensajes y generar respuestas.

**Funcionalidades:**
- Enviar mensajes a la IA y recibir respuestas
- Generar lista de mensajes sugeridos para el usuario

---

### Conversations Module

Manejo del historial de conversaciones por usuario.

**Schema de conversacion:**
```typescript
{
  userId: ObjectId     // referencia al usuario
  title: string        // titulo de la conversacion
  messages: [
    {
      role: 'user' | 'assistant'
      content: string
      timestamp: Date
    }
  ]
  createdAt: Date
  updatedAt: Date
}
```

---

### BigQuery Module

Servicio global para insertar trazas de conversacion en Google BigQuery para analytics.

**Datos registrados por mensaje:**
- `user_id`, `user_email`, `user_name`
- `conversation_id`
- `question` (mensaje del usuario)
- `answer` (respuesta de la IA)
- `timestamp`

---

### Tracking Module

Registro de eventos de usuario en MongoDB para auditoria interna.

**Eventos registrados:**
- `login`, `logout`
- `chat_message`
- Otras acciones de usuario

---

## API Reference

> Documentacion interactiva completa disponible en `http://localhost:3333/api/docs` (Swagger UI)

### Prefijo global: `/api`

### Auth (`/api/auth`)

| Metodo | Ruta | Auth | Descripcion |
|--------|------|------|-------------|
| POST | `/auth/login` | - | Login con email y password |
| POST | `/auth/register` | JWT (admin) | Registrar nuevo usuario (solo admin) |
| POST | `/auth/register-public` | - | Auto-registro publico (rol: user) |
| POST | `/auth/google` | - | Login/registro con Google OAuth |
| GET | `/auth/profile` | JWT | Obtener perfil del usuario actual |

**Body de login:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña"
}
```

**Respuesta exitosa:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "...",
    "email": "...",
    "name": "...",
    "role": "user"
  }
}
```

---

### Users (`/api/users`)

Todos los endpoints requieren JWT.

| Metodo | Ruta | Roles | Descripcion |
|--------|------|-------|-------------|
| GET | `/users` | admin | Listar todos los usuarios |
| GET | `/users/:id` | user, admin | Obtener usuario por ID |
| PUT | `/users/:id` | user, admin | Actualizar usuario |
| DELETE | `/users/:id` | admin | Eliminar usuario |

---

### Conversations (`/api/conversations`)

Todos los endpoints requieren JWT.

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/conversations` | Crear nueva conversacion |
| GET | `/conversations` | Listar conversaciones del usuario actual |
| GET | `/conversations/:id` | Obtener conversacion por ID |
| PUT | `/conversations/:id` | Actualizar conversacion (ej. renombrar) |
| DELETE | `/conversations/:id` | Eliminar conversacion |
| POST | `/conversations/:id/messages` | Enviar mensaje y obtener respuesta de la IA |

**Body de envio de mensaje:**
```json
{
  "content": "Cual es el estado de mi solicitud?"
}
```

**Respuesta de mensaje:**
```json
{
  "userMessage": {
    "role": "user",
    "content": "Cual es el estado de mi solicitud?",
    "timestamp": "2024-01-01T12:00:00.000Z"
  },
  "assistantMessage": {
    "role": "assistant",
    "content": "Tu solicitud se encuentra en proceso...",
    "timestamp": "2024-01-01T12:00:01.000Z"
  },
  "conversation": { }
}
```

---

### Chat (`/api/chat`)

Requiere JWT.

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/chat/send` | Enviar mensaje directo a la IA |
| GET | `/chat/suggestions` | Obtener mensajes sugeridos |

---

## Modelos de Datos

### User Schema (MongoDB)

```typescript
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  password: string;              // bcrypt hash

  @Prop({ required: true })
  name: string;

  @Prop({ default: 'user', enum: ['user', 'admin'] })
  role: string;

  @Prop()
  googleId: string;

  @Prop()
  avatar: string;

  @Prop({ default: true })
  isActive: boolean;
}
```

### Conversation Schema (MongoDB)

```typescript
@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop([MessageSchema])
  messages: Message[];
}
```

---

## Tests

```bash
# Tests unitarios
npm run test

# Tests en modo watch
npm run test:watch

# Tests e2e
npm run test:e2e

# Coverage
npm run test:cov
```
