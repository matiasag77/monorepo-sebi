# Dockerfile multi-stage para Next.js con pnpm
FROM node:24.14-alpine AS base

# # Instalar pnpm
# RUN corepack enable && corepack prepare pnpm@latest --activate

# Etapa 1: Instalar dependencias
FROM base AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json ./

# Instalar dependencias de producción y desarrollo
RUN npm install --frozen-lockfile

# Etapa 2: Build de la aplicación
FROM base AS builder
WORKDIR /app

# Copiar dependencias desde deps
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG ENVIRONMENT_VARIABLES
RUN echo -e ${ENVIRONMENT_VARIABLES} >> .env


# Configurar variables de entorno para el build
ENV NEXT_TELEMETRY_DISABLED=1

# Construir la aplicación
RUN npm run build

# Etapa 3: Runner - imagen de producción
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar archivos necesarios desde builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.env ./.env
# Cambiar permisos
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando para ejecutar la aplicación
CMD ["node", "server.js"]
