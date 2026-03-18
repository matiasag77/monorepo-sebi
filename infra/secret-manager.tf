# ─── Secret Manager ───────────────────────────────────────────────────
# Todos los secretos se almacenan aquí y se inyectan en Cloud Run

locals {
  secrets = {
    "jwt-secret"               = var.jwt_secret
    "nextauth-secret"          = var.nextauth_secret
    "google-oauth-client-id"   = var.google_oauth_client_id
    "google-oauth-client-secret" = var.google_oauth_client_secret
    "mongodb-uri"              = var.mongodb_uri
    "admin-password"           = var.admin_password
  }
}

resource "google_secret_manager_secret" "secrets" {
  for_each = local.secrets

  secret_id = "sebi-${each.key}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "secret_values" {
  for_each = local.secrets

  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = each.value
}
