variable "project_id" {
  description = "ID del proyecto de GCP"
  type        = string
}

variable "region" {
  description = "Región de GCP para desplegar los servicios"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Ambiente (dev, staging, prod)"
  type        = string
  default     = "prod"
}

# ─── Secretos (se pasan por tfvars o CLI, nunca en código) ───────────

variable "mongodb_uri" {
  description = "URI de conexión a MongoDB Atlas"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Secreto para firmar tokens JWT"
  type        = string
  sensitive   = true
}

variable "nextauth_secret" {
  description = "Secreto para NextAuth"
  type        = string
  sensitive   = true
}

variable "google_oauth_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  sensitive   = true
}

variable "google_oauth_client_secret" {
  description = "Google OAuth Client Secret"
  type        = string
  sensitive   = true
}

variable "admin_password" {
  description = "Contraseña del admin seed"
  type        = string
  sensitive   = true
}

# ─── Configuración de servicios ──────────────────────────────────────

variable "adk_api_url" {
  description = "URL del Cloud Run del ADK (externo)"
  type        = string
}

variable "admin_email" {
  description = "Email del admin seed"
  type        = string
  default     = "admin@sebi.com"
}

variable "bigquery_dataset" {
  description = "Dataset de BigQuery para trazas"
  type        = string
  default     = "sebi_chatbot"
}

variable "bigquery_table" {
  description = "Tabla de BigQuery para trazas"
  type        = string
  default     = "conversation_traces"
}

variable "jwt_expiration" {
  description = "Tiempo de expiración del JWT"
  type        = string
  default     = "2h"
}

# ─── Cloud Run scaling ───────────────────────────────────────────────

variable "api_max_instances" {
  description = "Máximo de instancias para api-bff"
  type        = number
  default     = 5
}

variable "frontend_max_instances" {
  description = "Máximo de instancias para frontend"
  type        = number
  default     = 5
}

# ─── GitHub repo (para Cloud Build triggers) ─────────────────────────

variable "github_owner" {
  description = "Owner del repositorio en GitHub"
  type        = string
}

variable "github_repo" {
  description = "Nombre del repositorio en GitHub"
  type        = string
}
