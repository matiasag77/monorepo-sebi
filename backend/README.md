# SEBI Chatbot — Backend (NestJS)

API BFF (Backend For Frontend) del chatbot analítico **SEBI**. Construido con NestJS, se encarga de autenticación, comunicación con el agente de IA en Cloud Run, historial de conversaciones y trazabilidad en BigQuery.

## Arquitectura

```
src/
├── auth/            # Autenticación JWT + Google OAuth + RBAC
├── gcp-auth/        # Módulo reutilizable de auth GCP (WIF / ADC / JSON key)
├── chat/            # Proxy hacia el agente ADK en Cloud Run
├── conversations/   # CRUD de conversaciones (MongoDB)
├── suggestions/     # Sugerencias de mensajes para el chat
├── bigquery/        # Trazabilidad de conversaciones en BigQuery
├── tracking/        # Auditoría de eventos de usuario
├── users/           # Gestión de usuarios
├── app.module.ts    # Módulo raíz
└── main.ts          # Bootstrap + Swagger
```

### Módulo `gcp-auth` (nuevo)

Módulo **global y reutilizable** que centraliza toda la lógica de autenticación con GCP:

| Método | Descripción |
|--------|-------------|
| `makeAuthenticatedRequest(url, opts)` | Request HTTP autenticado (WIF, IdTokenClient o fallback sin auth) |
| `getIdTokenWIF(audience)` | Genera ID Token via WIF (ExternalAccountClient -> generateIdToken) |
| `getExternalAccountClient(scopes)` | Devuelve un authClient para SDKs de GCP (BigQuery, Storage, etc.) |
| `getIdTokenClient(audience)` | Devuelve un IdTokenClient cacheado (non-WIF) |

Soporta tres modos de autenticación (en orden de prioridad):

1. **WIF** (`USE_WORKLOAD_IDENTITY=true`): para pods en EKS -> GCP via STS token exchange.
2. **JSON key file** (`GOOGLE_KEY_FILE` o `BIGQUERY_KEY_FILE`): credenciales explícitas.
3. **ADC** (Application Default Credentials): fallback automático.

## Requisitos

- Node.js >= 20
- MongoDB (local o Atlas)
- Credenciales GCP (opcional para desarrollo local)

## Instalación

```bash
cd backend
npm install
cp .env.example .env   # Editar con tus valores
```

## Desarrollo

```bash
npm run start:dev
```

La API estará disponible en `http://localhost:3333/api`.

## Swagger

Disponible por defecto en `http://localhost:3333/api/docs`.

Para desactivar: `SWAGGER_ENABLED=false`.

Incluye:

- Autenticación JWT persistente (Authorization header)
- Todos los endpoints documentados con DTOs
- Filtro y ordenamiento de operaciones

## Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `PORT` | Puerto del servidor (default: 3333) | No |
| `FRONTEND_URL` | URL del frontend para CORS | Si |
| `MONGODB_URI` | Connection string de MongoDB | Si |
| `JWT_SECRET` | Secreto para firmar JWT tokens | Si |
| `GOOGLE_CLIENT_ID` | Client ID de Google OAuth | Si |
| `GOOGLE_CLIENT_SECRET` | Client Secret de Google OAuth | Si |
| `ADK_API_URL` | URL del agente ADK en Cloud Run | Si |
| `BIGQUERY_PROJECT_ID` | ID del proyecto GCP para BigQuery | No |
| `BIGQUERY_KEY_FILE` | Ruta al JSON de service account | No |
| `BIGQUERY_DATASET` | Dataset de BigQuery (default: test_logs) | No |
| `BIGQUERY_TABLE` | Tabla de BigQuery (default: web_test) | No |
| `USE_WORKLOAD_IDENTITY` | Activar WIF (`true`/`false`) | No |
| `WORKLOAD_IDENTITY_AUDIENCE` | Audience URL para WIF | Si (con WIF) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email de la SA de GCP | Si (con WIF) |
| `AWS_WEB_IDENTITY_TOKEN_FILE` | Path al token OIDC del pod | No |
| `GOOGLE_KEY_FILE` | Ruta a credenciales JSON de GCP | No |
| `SWAGGER_ENABLED` | Habilitar Swagger (default: true) | No |

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run start:dev` | Desarrollo con hot reload |
| `npm run build` | Compilar a JavaScript |
| `npm run start:prod` | Producción (`node dist/main`) |
| `npm run test` | Tests unitarios |
| `npm run test:e2e` | Tests end-to-end |
| `npm run lint` | Linter (ESLint) |

## Autenticación GCP en producción (WIF)

En EKS, el pod usa IRSA para obtener un JWT OIDC de AWS. El módulo `gcp-auth` intercambia ese token con GCP STS para impersonar una Service Account:

```
Pod (EKS) -> JWT OIDC -> GCP STS -> Access Token -> SA Impersonation -> ID Token / API Calls
```

Esto permite acceder a Cloud Run (chat) y BigQuery (trazabilidad) sin manejar archivos JSON de credenciales.

## Endpoints principales

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/api/auth/login` | Login con email/password | No |
| `POST` | `/api/auth/google` | Login con Google OAuth | No |
| `POST` | `/api/auth/register-public` | Auto-registro | No |
| `GET` | `/api/auth/profile` | Perfil del usuario actual | JWT |
| `POST` | `/api/chat/send` | Enviar mensaje al agente IA | JWT |
| `GET` | `/api/conversations` | Listar conversaciones | JWT |
| `GET` | `/api/suggestions` | Obtener sugerencias | JWT |
| `GET` | `/api/users` | Listar usuarios (admin) | JWT + Admin |
