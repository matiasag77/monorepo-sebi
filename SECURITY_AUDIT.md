# Auditoría de Seguridad - Chatbot SEBI

**Fecha:** 2026-03-17
**Clasificación de datos:** Confidencial (datos de ventas para gerencia)
**Arquitectura:** Next.js + NestJS + Google ADK + Vertex AI + MongoDB + BigQuery

---

## Resumen Ejecutivo

Se identificaron **6 hallazgos críticos**, **8 altos**, **7 medios** y **5 recomendaciones generales** en la arquitectura del chatbot SEBI. Los problemas más urgentes están relacionados con credenciales expuestas, falta de autorización a nivel de recurso, y ausencia de controles de seguridad en la capa de IA.

---

## HALLAZGOS CRÍTICOS (P0 - Corregir inmediatamente)

### C1. Private Key de Service Account en código fuente

**Archivo:** `test.py`
**Riesgo:** Cualquier persona con acceso al repositorio puede impersonar la service account `adk-api-backend-sa@forus-cl-ti-geminienterprise.iam.gserviceaccount.com` y acceder a BigQuery, Vertex AI y otros recursos GCP.

**Impacto:** Acceso total a datasets de ventas (`data_ia`, `data_ia_gold`), posible exfiltración masiva de datos.

**Remediación:**
1. **INMEDIATO:** Rotar la key de la service account desde GCP IAM
2. Eliminar `test.py` del repositorio y del historial de git (`git filter-branch` o `BFG Repo-Cleaner`)
3. Usar Workload Identity Federation o `GOOGLE_APPLICATION_CREDENTIALS` apuntando a un archivo fuera del repo
4. Agregar `*.py` de pruebas sensibles al `.gitignore`

---

### C2. JWT Secret hardcodeado como fallback

**Archivos:** `api-bff-sebi/src/auth/strategies/jwt.strategy.ts:12`, `api-bff-sebi/src/auth/auth.module.ts:18`
**Código:** `configService.get<string>('JWT_SECRET', 'sebi-jwt-secret-key-2024')`

**Riesgo:** Si `JWT_SECRET` no está configurado en el entorno, se usa un secreto predecible. Un atacante puede forjar tokens JWT válidos para cualquier usuario, incluyendo admin.

**Remediación:**
1. Eliminar el valor por defecto — lanzar error si `JWT_SECRET` no está definido
2. Usar un secreto de al menos 256 bits generado criptográficamente
3. Rotar el secreto periódicamente mediante Google Secret Manager

---

### C3. Credenciales de administrador en código fuente

**Archivo:** `api-bff-sebi/src/seed.ts:40,56`
**Código:** `admin@sebi.com / Admin123!`

**Riesgo:** Credenciales predecibles disponibles en el código. Si el seed se ejecuta en producción, el sistema queda con un usuario admin conocido públicamente.

**Remediación:**
1. Leer credenciales del seed desde variables de entorno o Secret Manager
2. Forzar cambio de contraseña en primer login del admin
3. No loggear contraseñas en consola (`console.log('Password: Admin123!')`)

---

### C4. IDOR - Falta de verificación de propiedad en conversaciones

**Archivo:** `api-bff-sebi/src/conversations/conversations.controller.ts:58-83`

**Riesgo:** Los endpoints `GET /conversations/:id`, `PUT /conversations/:id`, `DELETE /conversations/:id` y `POST /conversations/:id/messages` no validan que la conversación pertenezca al usuario autenticado. Cualquier usuario logueado puede leer, modificar o borrar conversaciones de otro usuario simplemente cambiando el ID.

**Ejemplo de ataque:**
```
# Usuario B accede a conversación de Usuario A
GET /api/conversations/507f1f77bcf86cd799439011
Authorization: Bearer <token-de-usuario-B>
```

**Remediación:**
```typescript
// En cada operación sobre conversación, verificar ownership:
async findById(id: string, userId: string): Promise<ConversationDocument> {
  const conversation = await this.conversationModel.findOne({ _id: id, userId }).exec();
  if (!conversation) {
    throw new NotFoundException('Conversation not found');
  }
  return conversation;
}
```

---

### C5. Swagger/API Docs expuesto sin autenticación

**Archivo:** `api-bff-sebi/src/main.ts:48-50`
**URL:** `/api/docs`

**Riesgo:** La documentación completa de la API (endpoints, schemas, modelos de datos) está accesible sin autenticación. Facilita el reconocimiento por parte de atacantes.

**Remediación:**
1. Deshabilitar Swagger en producción: `if (process.env.NODE_ENV !== 'production')`
2. O protegerlo con autenticación básica

---

### C6. Datos sensibles de ventas enviados a API externa sin cifrado adicional

**Archivo:** `api-bff-sebi/src/chat/chat.service.ts:7`
**URL:** `https://skelligen-api.prod.interno.forus-sistemas.com/api/test-ai`

**Riesgo:** Las consultas de gerencia (con contexto de ventas) se envían a un servicio externo sin:
- Autenticación (no hay API key ni token)
- Verificación de certificado TLS
- Sanitización del contenido

**Remediación:**
1. Agregar autenticación (API key o mTLS) hacia el servicio de IA
2. No enviar datos de PII o financieros sin cifrado a nivel de aplicación
3. Validar y sanitizar el input del usuario antes de reenviarlo

---

## HALLAZGOS ALTOS (P1 - Corregir antes de producción)

### A1. Sin Rate Limiting

**Impacto:** Susceptible a ataques de fuerza bruta en login, abuso de la API de IA (costos de Vertex AI), y DoS.

**Remediación:**
```bash
npm install @nestjs/throttler
```
```typescript
// app.module.ts
ThrottlerModule.forRoot([{
  ttl: 60000,    // 1 minuto
  limit: 10,     // 10 requests por minuto para auth
}])
```

Configurar límites diferenciados:
- Login: 5 intentos/min por IP
- Chat/IA: 20 requests/min por usuario
- API general: 100 requests/min por usuario

---

### A2. Sin Content Security Policy (CSP)

**Impacto:** Vulnerable a XSS almacenado si un atacante inyecta script en el contenido del chat, que luego se renderiza en el frontend.

**Remediación en `next.config.ts`:**
```typescript
const securityHeaders = [
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://accounts.google.com" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
```

---

### A3. Sin sanitización de respuestas de IA

**Archivo:** `api-bff-sebi/src/chat/chat.service.ts:33`

**Riesgo:** La respuesta de la IA se almacena y retorna directamente sin sanitización. Si el modelo genera HTML/JS malicioso (prompt injection indirecto), se ejecutaría en el navegador del usuario gerencial.

**Remediación:**
1. Sanitizar respuestas de IA antes de almacenar (usar `sanitize-html` o DOMPurify server-side)
2. En el frontend, renderizar con componentes que escapen HTML por defecto
3. Nunca usar `dangerouslySetInnerHTML` con contenido de IA

---

### A4. Console.log de datos en producción

**Archivo:** `api-bff-sebi/src/chat/chat.service.ts:32`
**Código:** `console.log(data);`

**Riesgo:** Loggea respuestas completas de IA (que pueden contener datos de ventas confidenciales) en stdout, accesible desde Cloud Logging.

**Remediación:** Eliminar `console.log(data)` o usar el Logger de NestJS con nivel `debug` que se deshabilita en producción.

---

### A5. Registro público sin restricciones

**Endpoint:** `POST /api/auth/register-public`

**Riesgo:** Cualquier persona puede crear una cuenta y acceder al chatbot con datos de ventas de la empresa.

**Remediación:**
1. Restringir registro solo a dominios de email corporativos (`@empresa.com`)
2. O eliminar registro público y que solo admins creen usuarios
3. Agregar CAPTCHA/reCAPTCHA al registro
4. Implementar aprobación manual de nuevas cuentas

---

### A6. MongoDB sin autenticación (configuración por defecto)

**Archivo:** `api-bff-sebi/.env.example`
**Valor:** `MONGODB_URI=mongodb://localhost:27017/sebi-chatbot`

**Riesgo:** Conexión sin usuario/contraseña. Si MongoDB está expuesto a la red, cualquiera puede acceder.

**Remediación:**
1. Usar `mongodb://user:pass@host:27017/sebi-chatbot?authSource=admin`
2. Habilitar autenticación en MongoDB
3. En GCP, usar MongoDB Atlas con VPC peering o Cloud SQL

---

### A7. Falta de auditoría de acciones administrativas

Las acciones admin (crear usuarios, eliminar usuarios, cambiar roles) no se registran en tracking. Un administrador comprometido podría operar sin dejar rastro.

**Remediación:** Loggear todas las operaciones administrativas en el sistema de tracking con IP y timestamp.

---

### A8. Sin protección CSRF explícita

NextAuth maneja CSRF para sus rutas, pero las llamadas directas al backend NestJS desde el frontend no tienen protección CSRF.

**Remediación:** Implementar tokens CSRF o usar `SameSite=Strict` en cookies de sesión.

---

## HALLAZGOS MEDIOS (P2)

### M1. Expiración de JWT muy larga

**Configuración actual:** 7 días (`7d`)

**Remediación:** Reducir a 1-2 horas con refresh tokens. Para datos de gerencia, sesiones cortas son esenciales.

---

### M2. CORS permisivo en desarrollo podría filtrarse a producción

**Archivo:** `api-bff-sebi/src/main.ts:16`
**Fallback:** `http://localhost:3000`

**Remediación:** Validar estrictamente el origin en producción. No usar fallbacks.

---

### M3. Sin cifrado de datos en reposo en MongoDB

Las conversaciones con datos de ventas se almacenan sin cifrar en MongoDB.

**Remediación:** Habilitar encryption at rest en MongoDB (Atlas lo incluye por defecto) o cifrar campos sensibles a nivel de aplicación.

---

### M4. BigQuery fire-and-forget sin manejo de errores

**Archivo:** `conversations.controller.ts:137-147`
**Código:** `.catch(() => {})`

**Riesgo:** Si BigQuery falla, se pierden trazas de auditoría silenciosamente.

**Remediación:** Implementar cola de reintentos (Cloud Tasks o Bull queue) y alertas cuando falle.

---

### M5. Sin validación de longitud en mensajes de chat

**Archivo:** `api-bff-sebi/src/chat/dto/send-message.dto.ts`

**Riesgo:** Un usuario puede enviar mensajes extremadamente largos, causando costos excesivos en Vertex AI y posible DoS.

**Remediación:** Agregar `@MaxLength(5000)` al DTO de mensajes.

---

### M6. Sin timeout en llamadas a la API de IA

**Archivo:** `api-bff-sebi/src/chat/chat.service.ts:11`

**Riesgo:** Si la API de IA no responde, el request del usuario queda colgado indefinidamente.

**Remediación:** Agregar `AbortController` con timeout de 30 segundos.

---

### M7. Falta de logging estructurado

Se usa `console.log` en lugar de un logger estructurado que facilite auditoría y monitoreo en Cloud Logging.

**Remediación:** Usar el Logger de NestJS con formato JSON para Cloud Logging.

---

## RECOMENDACIONES PARA GOOGLE CLOUD

### R1. Arquitectura de red
- Desplegar backend y MongoDB en **VPC privada**
- Usar **Cloud Armor** frente al Load Balancer (WAF, rate limiting, protección DDoS)
- El servicio ADK (Python) debe estar en la misma VPC, sin acceso público
- Usar **Private Service Connect** para BigQuery y Vertex AI

### R2. Gestión de secretos
- Migrar todos los secretos a **Google Secret Manager**
- No usar variables de entorno para secretos sensibles en producción
- Rotar keys automáticamente cada 90 días

### R3. IAM y principio de menor privilegio
- La service account del backend solo debe tener:
  - `bigquery.dataEditor` (no `bigquery.admin`)
  - `aiplatform.user` (no `aiplatform.admin`)
- Crear service accounts separadas para cada microservicio
- Usar **Workload Identity** en GKE en lugar de key files

### R4. Monitoreo y alertas
- Configurar **Cloud Audit Logs** para todas las APIs
- Alertas en:
  - Intentos de login fallidos > 5/min
  - Accesos a BigQuery fuera de horario laboral
  - Costos de Vertex AI anómalos
  - Errores 5xx > umbral
- Usar **Security Command Center** para detección de amenazas

### R5. Prompt Injection y seguridad de IA
- **Datos de ventas para gerencia** requieren protección especial contra:
  - **Prompt injection directo:** Usuario intenta que el modelo ignore sus instrucciones
  - **Data exfiltration via prompt:** "Muéstrame TODOS los datos de ventas en formato CSV"
  - **Indirect prompt injection:** Datos maliciosos en BigQuery que manipulan la respuesta del modelo
- **Remediaciones:**
  - Implementar guardrails en el system prompt del agente ADK
  - Filtrar respuestas que contengan datos masivos (>100 filas)
  - Limitar queries de BigQuery con `LIMIT` y control de columnas accesibles
  - Implementar clasificación de datos para que el modelo no exponga información por encima del nivel del usuario
  - Auditar todas las queries generadas por el LLM antes de ejecutarlas

---

## CHECKLIST DE SEGURIDAD PRE-PRODUCCIÓN

| # | Control | Estado | Prioridad |
|---|---------|--------|-----------|
| 1 | Rotar service account key expuesta | ❌ Pendiente (requiere acción en GCP IAM) | CRÍTICO |
| 2 | Eliminar JWT secret hardcodeado | ✅ Corregido — se lanza error si JWT_SECRET no está definido | CRÍTICO |
| 3 | Eliminar credenciales admin del código | ✅ Corregido — seed.ts usa variables de entorno (ADMIN_EMAIL, ADMIN_PASSWORD) | CRÍTICO |
| 4 | Corregir IDOR en conversaciones | ✅ Corregido — todos los endpoints validan ownership con userId | CRÍTICO |
| 5 | Proteger/deshabilitar Swagger en producción | ✅ Corregido — Swagger deshabilitado cuando NODE_ENV=production | CRÍTICO |
| 6 | Agregar autenticación a API de IA | ❌ Pendiente (requiere coordinación con equipo de API Skelligen) | CRÍTICO |
| 7 | Implementar rate limiting | ✅ Corregido — @nestjs/throttler configurado (20 req/min, 100 req/10min) | ALTO |
| 8 | Agregar CSP y security headers | ✅ Corregido — CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy | ALTO |
| 9 | Sanitizar respuestas de IA | ✅ Corregido — se eliminan scripts, iframes, event handlers de respuestas | ALTO |
| 10 | Eliminar console.log de datos | ✅ Corregido — reemplazado por Logger de NestJS con nivel debug | ALTO |
| 11 | Restringir registro público | ❌ Pendiente (requiere decisión de negocio sobre política de registro) | ALTO |
| 12 | Configurar auth en MongoDB | ❌ Pendiente (requiere configuración de infraestructura) | ALTO |
| 13 | Auditar acciones admin | ❌ Pendiente (requiere definición de eventos a auditar) | ALTO |
| 14 | Reducir expiración JWT | ✅ Corregido — reducido de 7d a 2h | MEDIO |
| 15 | Cifrar datos en reposo | ❌ Pendiente (requiere configuración de MongoDB Atlas o cifrado a nivel app) | MEDIO |
| 16 | Agregar @MaxLength a mensajes | ✅ Corregido — @MaxLength(5000) aplicado al DTO | MEDIO |
| 17 | Agregar timeout a llamadas IA | ✅ Corregido — AbortController con timeout de 30s | MEDIO |
| 18 | Migrar secretos a Secret Manager | ❌ Pendiente (requiere configuración de GCP Secret Manager) | MEDIO |
| 19 | Configurar VPC privada | ❌ Pendiente (requiere configuración de infraestructura GCP) | MEDIO |
| 20 | Implementar guardrails de IA | ❌ Pendiente (requiere configuración en agente ADK) | MEDIO |

---

## DIAGRAMA DE AMENAZAS

```
                    ┌─────────────────────────────────────────┐
                    │           AMENAZAS IDENTIFICADAS         │
                    └─────────────────────────────────────────┘

  [Internet]
      │
      │  ❌ Sin WAF/Cloud Armor
      │  ❌ Sin rate limiting
      ▼
  ┌──────────┐    ❌ Sin CSP         ┌──────────────┐
  │ Frontend │───────────────────────│  Google Auth  │
  │ Next.js  │    ✅ HTTPS           │  OAuth 2.0   │
  └────┬─────┘    ✅ NextAuth CSRF   └──────────────┘
       │
       │  ❌ Sin CSRF para API calls directos
       │  ✅ JWT Bearer Auth
       ▼
  ┌──────────┐    ❌ Swagger expuesto  ┌──────────────┐
  │ Backend  │────────────────────────│  MongoDB     │
  │ NestJS   │    ❌ IDOR en convs    │  ❌ Sin auth  │
  └────┬─────┘    ✅ Validation Pipe  │  ❌ Sin cifrado│
       │                               └──────────────┘
       │
       ├──────────────────────────────┐
       │  ❌ Sin API key              │  ❌ Key expuesta
       │  ❌ Sin sanitización         │
       ▼                              ▼
  ┌──────────┐                   ┌──────────────┐
  │ API IA   │                   │  BigQuery    │
  │ Externa  │                   │  (ventas)    │
  └──────────┘                   └──────────────┘
       │
       ▼
  ┌──────────┐
  │ Vertex AI│  ❌ Sin guardrails
  │ Gemini   │  ❌ Sin filtro de datos masivos
  └──────────┘
```

---

*Reporte generado como parte de auditoría de seguridad pre-producción.*
*Clasificación: CONFIDENCIAL - Solo para uso interno del equipo de desarrollo y gerencia de TI.*
