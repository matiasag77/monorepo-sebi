# SEBI - AI Chatbot Platform

Monorepo full-stack para una plataforma de chatbot con inteligencia artificial. Incluye un backend BFF (Backend-for-Frontend) construido con NestJS y un frontend construido con Next.js.

## Descripcion del Proyecto

SEBI es una aplicacion de chat con IA que permite a los usuarios mantener conversaciones inteligentes a traves de la API de Skelligen. Cuenta con autenticacion multi-proveedor, historial de conversaciones, panel de administracion y analíticas en tiempo real con Google BigQuery.

## Estructura del Monorepo

```
monorepo-sebi/
├── api-bff-sebi/        # Backend NestJS (BFF)
├── front-sebi/          # Frontend Next.js
└── README.md            # Este archivo
```

## Aplicaciones

| Aplicacion | Tecnologia | Descripcion |
|-----------|-----------|-------------|
| `api-bff-sebi` | NestJS + MongoDB | API REST con autenticacion, chat y analytics |
| `front-sebi` | Next.js + React | Interfaz de usuario del chatbot |

## Funcionalidades Principales

- **Chat con IA:** Conversaciones en tiempo real con la API de Skelligen
- **Autenticacion:** Login con email/password y Google OAuth
- **Historial:** Registro y consulta de conversaciones previas
- **Administracion:** Panel admin para gestion de usuarios
- **Analytics:** Tracking de eventos con Google BigQuery
- **Sugerencias:** Mensajes sugeridos generados por IA

## Stack Tecnologico

**Backend:**
- NestJS 11 / Node.js
- MongoDB + Mongoose
- Passport.js (JWT, Local, Google OAuth2)
- Google BigQuery
- Swagger/OpenAPI

**Frontend:**
- Next.js 16 / React 19
- NextAuth v5
- Tailwind CSS v4
- TypeScript

## Inicio Rapido

### 1. Backend

```bash
cd api-bff-sebi
cp .env.example .env
# Configurar variables de entorno
npm install
npm run start:dev
```

### 2. Frontend

```bash
cd front-sebi
cp .env.example .env.local
# Configurar variables de entorno
npm install
npm run dev
```

## Documentacion Detallada

- [Backend (api-bff-sebi)](./api-bff-sebi/README.md)
- [Frontend (front-sebi)](./front-sebi/README.md)
