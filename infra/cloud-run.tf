data "google_project" "project" {
  project_id = var.project_id
}

# ─── Cloud Run: service-adk (interno) ─────────────────────────────────

resource "google_cloud_run_v2_service" "adk" {
  name     = "sebi-adk"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    service_account = google_service_account.adk_sa.email

    scaling {
      min_instance_count = 0
      max_instance_count = var.adk_max_instances
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/sebi-repo/service-adk:latest"

      ports {
        container_port = 8000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "ADK_MODE"
        value = "simple"
      }

      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
    }
  }

  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.sebi_repo,
  ]
}

# ─── Cloud Run: api-bff-sebi (público) ───────────────────────────────

resource "google_cloud_run_v2_service" "api" {
  name     = "sebi-api-bff"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.api_sa.email

    vpc_access {
      connector = google_vpc_access_connector.sebi_connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    scaling {
      min_instance_count = 0
      max_instance_count = var.api_max_instances
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/sebi-repo/api-bff-sebi:latest"

      ports {
        container_port = 3333
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      # Variables de entorno normales
      env {
        name  = "PORT"
        value = "3333"
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "AI_PROVIDER"
        value = var.ai_provider
      }

      env {
        name  = "ADK_API_URL"
        value = google_cloud_run_v2_service.adk.uri
      }

      env {
        name  = "FRONTEND_URL"
        value = "https://sebi-frontend-${data.google_project.project.number}.${var.region}.run.app"
      }

      env {
        name  = "BIGQUERY_PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "BIGQUERY_DATASET"
        value = var.bigquery_dataset
      }

      env {
        name  = "BIGQUERY_TABLE"
        value = var.bigquery_table
      }

      env {
        name  = "ADMIN_EMAIL"
        value = var.admin_email
      }

      env {
        name  = "JWT_EXPIRATION"
        value = var.jwt_expiration
      }

      # Variables desde Secret Manager
      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["jwt-secret"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "GOOGLE_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["google-oauth-client-id"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "GOOGLE_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["google-oauth-client-secret"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "MONGODB_URI"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["mongodb-uri"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "ADMIN_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["admin-password"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "SKELLIGEN_API_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["skelligen-api-url"].secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.sebi_repo,
    google_secret_manager_secret_version.secret_values,
  ]
}

# Permitir acceso público (sin autenticación) a la API
resource "google_cloud_run_v2_service_iam_member" "api_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ─── Cloud Run: front-sebi (público) ─────────────────────────────────

resource "google_cloud_run_v2_service" "frontend" {
  name     = "sebi-frontend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.frontend_sa.email

    scaling {
      min_instance_count = 0
      max_instance_count = var.frontend_max_instances
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/sebi-repo/front-sebi:latest"

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "256Mi"
        }
      }

      env {
        name  = "NEXT_PUBLIC_API_URL"
        value = "${google_cloud_run_v2_service.api.uri}/api"
      }

      # NEXTAUTH_URL se configura manualmente después del primer deploy
      # con la URL real del servicio frontend
      env {
        name  = "NEXTAUTH_URL"
        value = "https://sebi-frontend-${data.google_project.project.number}.${var.region}.run.app"
      }

      env {
        name = "NEXTAUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["nextauth-secret"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "GOOGLE_CLIENT_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["google-oauth-client-id"].secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "GOOGLE_CLIENT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.secrets["google-oauth-client-secret"].secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.sebi_repo,
    google_secret_manager_secret_version.secret_values,
  ]
}

# Permitir acceso público (sin autenticación) al frontend
resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.frontend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
