# Diagrama de Seguridad — SEBI App

> Arquitectura de seguridad de la aplicación SEBI para el equipo de Ciberseguridad.

---

## 1. Flujo de Autenticación

```mermaid
sequenceDiagram
    actor Usuario
    participant FE as Frontend<br/>(Next.js)
    participant BE as Backend BFF<br/>(NestJS)
    participant Google as Google OAuth 2.0
    participant DB as MongoDB

    %% Login local
    rect rgb(230, 240, 255)
        Note over Usuario,DB: Flujo 1 — Login Email/Password
        Usuario->>FE: Ingresa email (@forus.cl) + password
        FE->>BE: POST /auth/login
        BE->>BE: LocalAuthGuard valida credenciales
        BE->>DB: Busca usuario por email
        DB-->>BE: Usuario encontrado
        BE->>BE: bcrypt.compare(password, hash)
        BE->>BE: Verifica isActive = true
        BE->>BE: Valida dominio @forus.cl
        BE-->>FE: JWT access_token + perfil usuario
        FE->>FE: Almacena token (NextAuth session)
    end

    %% Login Google
    rect rgb(230, 255, 235)
        Note over Usuario,DB: Flujo 2 — Google OAuth 2.0
        Usuario->>FE: Click "Iniciar con Google"
        FE->>Google: Redirect OAuth 2.0
        Google-->>FE: id_token + datos de perfil
        FE->>BE: POST /auth/google {email, name, googleId, avatar}
        BE->>BE: Valida dominio @forus.cl
        BE->>DB: Busca o crea usuario (provider: google)
        BE->>BE: Verifica isActive = true
        BE-->>FE: JWT access_token + perfil usuario
    end
```

---

## 2. Arquitectura de Seguridad — Vista General

```mermaid
flowchart TB
    subgraph Internet["🌐 Internet (Zona No Confiable)"]
        U[("👤 Usuario\n@forus.cl")]
    end

    subgraph GCP_Auth["☁️ Google Cloud — Identidad"]
        GOAUTH["Google OAuth 2.0\nClient ID: 572004..."]
        GSA["Service Account\nsebi-app-prod@forus-cl-ti-geminienterprise\n.iam.gserviceaccount.com"]
    end

    subgraph K8S["☸️ Kubernetes — Namespace: prod"]
        direction TB

        subgraph FE_POD["Pod: Frontend"]
            NEXT["Next.js 16\nNextAuth v5"]
        end

        subgraph BE_POD["Pod: Backend BFF"]
            NEST["NestJS 11\nPassport.js"]
            subgraph GUARDS["Guards de Seguridad"]
                JG["JwtAuthGuard\n(Bearer Token)"]
                LG["LocalAuthGuard\n(email + password)"]
                RG["RolesGuard\n(admin | user)"]
            end
        end

        CM["ConfigMap: api-bff-sebi\n(sin secrets en texto plano)"]
    end

    subgraph DATA["🗄️ Capa de Datos"]
        MONGO[("MongoDB\nUsuarios + Conversaciones")]
    end

    subgraph GCP_Services["☁️ Google Cloud — Servicios"]
        BQ[("BigQuery\nAudit Logs\nforus-cl-ti-geminienterprise")]
        ADK["ADK Agent\nCloud Run\nadktestv1-367988...run.app"]
    end

    %% Conexiones usuario
    U -->|"HTTPS"| NEXT
    U -->|"OAuth 2.0"| GOAUTH
    GOAUTH -->|"id_token"| NEXT

    %% Frontend → Backend
    NEXT -->|"HTTPS + JWT\nBearer Token"| NEST

    %% Backend internals
    NEST --- JG
    NEST --- LG
    NEST --- RG

    %% Backend → Datos
    NEST -->|"TLS"| MONGO
    NEST -->|"Workload Identity\n(EKS ↔ GCP)"| BQ
    NEST -->|"HTTPS + GCP Auth"| ADK

    %% Config
    CM -.->|"Env vars"| NEST

    %% Google SA
    GSA -.->|"Workload Identity Federation\nEKS Pool → GCP IAM"| NEST

    %% Estilos
    classDef secure fill:#d4edda,stroke:#28a745,color:#000
    classDef warning fill:#fff3cd,stroke:#ffc107,color:#000
    classDef danger fill:#f8d7da,stroke:#dc3545,color:#000
    classDef cloud fill:#cce5ff,stroke:#004085,color:#000

    class NEXT,NEST secure
    class MONGO,BQ,ADK cloud
    class GOAUTH,GSA cloud
    class JG,LG,RG secure
```

---

## 3. Modelo de Control de Acceso (RBAC)

```mermaid
flowchart LR
    subgraph Roles["Roles de Usuario"]
        ADMIN["🔑 admin"]
        USER["👤 user"]
    end

    subgraph Endpoints["Endpoints Protegidos"]
        E1["POST /auth/register\n(admin only)"]
        E2["GET /auth/profile\n(JWT requerido)"]
        E3["GET /users/*\n(JWT requerido)"]
        E4["POST /chat/*\n(JWT requerido)"]
        E5["GET /conversations/*\n(JWT requerido)"]
    end

    subgraph Public["Endpoints Públicos"]
        P1["POST /auth/login"]
        P2["POST /auth/google"]
        P3["POST /auth/register-public"]
    end

    ADMIN -->|"✅"| E1
    ADMIN -->|"✅"| E2
    ADMIN -->|"✅"| E3
    ADMIN -->|"✅"| E4
    ADMIN -->|"✅"| E5

    USER -->|"❌ Forbidden"| E1
    USER -->|"✅"| E2
    USER -->|"✅"| E4
    USER -->|"✅"| E5
```

---

## 4. Flujo de Auditoría y Trazabilidad

```mermaid
flowchart LR
    A["👤 Acción de Usuario\n(login, chat, etc.)"]
    B["Backend NestJS\nTrackingService"]
    C[("BigQuery\nDataset: test_logs\nTable: web_test")]
    D["📊 Dashboard / Alertas"]

    A -->|"userId + action"| B
    B -->|"Workload Identity\n(sin credenciales en disco)"| C
    C --> D

    style C fill:#cce5ff,stroke:#004085
    style D fill:#d4edda,stroke:#28a745
```

---

## 5. Workload Identity Federation (EKS → GCP)

```mermaid
flowchart TB
    subgraph EKS["AWS EKS — Namespace prod"]
        SA["Kubernetes Service Account\nPod: api-bff-sebi"]
    end

    subgraph GCP_IAM["Google Cloud IAM"]
        WIP["Workload Identity Pool\neks-forus-stack-pool\n/ eks-provider"]
        GSA2["Google Service Account\nsebi-app-prod@\nforus-cl-ti-geminienterprise.iam"]
        BQ2[("BigQuery\nCloud Run")]
    end

    SA -->|"OIDC Token\n(corta vida)"| WIP
    WIP -->|"Impersonation"| GSA2
    GSA2 -->|"Acceso autorizado"| BQ2

    note1["✅ Sin claves JSON en disco\n✅ Token efímero\n✅ Rotación automática"]
    GSA2 -.-> note1

    style note1 fill:#d4edda,stroke:#28a745,color:#000
```

---

## 6. Resumen de Controles de Seguridad

| Control | Implementación | Estado |
|---|---|---|
| Autenticación | JWT (Passport.js) + Google OAuth 2.0 | ✅ Activo |
| Contraseñas | bcrypt (salt rounds: 10) | ✅ Activo |
| Restricción de dominio | Solo `@forus.cl` permitido | ✅ Activo |
| Autorización | RBAC (roles: `admin`, `user`) | ✅ Activo |
| Gestión de credenciales GCP | Workload Identity Federation (sin JSON key) | ✅ Activo |
| Auditoría de eventos | BigQuery (login, acciones de usuario) | ✅ Activo |
| Transporte | HTTPS en todos los endpoints externos | ✅ Requerido |
| Secrets en Kubernetes | ConfigMap (sin secrets en texto plano) | ⚠️ Revisar uso de K8s Secrets |
| Cuenta desactivada | Verificación `isActive` en login | ✅ Activo |
| Rate limiting | No detectado | ⚠️ Pendiente evaluar |
| CORS | No revisado en este diagrama | ⚠️ Verificar configuración |
