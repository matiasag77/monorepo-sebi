# ─── Artifact Registry ────────────────────────────────────────────────
# Repositorio Docker para almacenar las imágenes de los 3 servicios

resource "google_artifact_registry_repository" "sebi_repo" {
  location      = var.region
  repository_id = "sebi-repo"
  description   = "Imágenes Docker del chatbot SEBI"
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }

  depends_on = [google_project_service.apis]
}
