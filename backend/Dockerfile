# Dockerfile optimizado para NestJS + Node 24 (multi-stage)
FROM node:24.14-alpine AS base

# Etapa 1: Instalar dependencias
FROM base AS deps
WORKDIR /app

# Copiar solo archivos de dependencias
COPY package*.json ./

# Instalar dependencias separadas (prod y dev ahora, luego se separan)
RUN npm ci

# Etapa 2: Build de la aplicación
FROM base AS builder
WORKDIR /app

# Copiar node_modules desde deps
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fuente
COPY . .

# Build de NestJS
RUN npm run build

# Etapa 3: Preparar dependencias de producción solo
FROM base AS prod-deps
WORKDIR /app

COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Etapa 4: Runtime - imagen de producción optimizada
FROM base AS runner
WORKDIR /app

# Variables de entorno
ENV NODE_ENV=production
ENV NODE_OPTIONS="--enable-source-maps --disable-warning MaxListenersExceededWarning"

# Herramientas mínimas para diagnóstico en runtime
RUN apk add --no-cache curl

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copiar dependencias de producción
COPY --from=prod-deps /app/node_modules ./node_modules

# Copiar archivos compilados desde builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Cambiar permisos
RUN chown -R nestjs:nodejs /app

# Cambiar a usuario no-root
USER nestjs

EXPOSE 3000

# Comando principal
CMD ["node", "dist/main"]
