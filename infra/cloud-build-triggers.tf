# ─── Cloud Build Triggers ─────────────────────────────────────────────
# Cada servicio tiene su propio trigger que se activa al pushear a main

resource "google_cloudbuild_trigger" "deploy_api" {
  name        = "deploy-api-bff"
  description = "Build y deploy de api-bff-sebi a Cloud Run"
  location    = var.region

  github {
    owner = var.github_owner
    name  = var.github_repo

    push {
      branch = "^main$"
    }
  }

  included_files = ["api-bff-sebi/**"]
  filename       = "cloudbuild/cloudbuild-api.yaml"

  substitutions = {
    _REGION          = var.region
    _SERVICE_ACCOUNT = google_service_account.api_sa.email
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${google_service_account.cloudbuild_sa.email}"

  depends_on = [google_project_service.apis]
}

resource "google_cloudbuild_trigger" "deploy_frontend" {
  name        = "deploy-frontend"
  description = "Build y deploy de front-sebi a Cloud Run"
  location    = var.region

  github {
    owner = var.github_owner
    name  = var.github_repo

    push {
      branch = "^main$"
    }
  }

  included_files = ["front-sebi/**"]
  filename       = "cloudbuild/cloudbuild-frontend.yaml"

  substitutions = {
    _REGION          = var.region
    _SERVICE_ACCOUNT = google_service_account.frontend_sa.email
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${google_service_account.cloudbuild_sa.email}"

  depends_on = [google_project_service.apis]
}

resource "google_cloudbuild_trigger" "deploy_adk" {
  name        = "deploy-adk"
  description = "Build y deploy de service-adk a Cloud Run"
  location    = var.region

  github {
    owner = var.github_owner
    name  = var.github_repo

    push {
      branch = "^main$"
    }
  }

  included_files = ["service-adk/**"]
  filename       = "cloudbuild/cloudbuild-adk.yaml"

  substitutions = {
    _REGION          = var.region
    _SERVICE_ACCOUNT = google_service_account.adk_sa.email
  }

  service_account = "projects/${var.project_id}/serviceAccounts/${google_service_account.cloudbuild_sa.email}"

  depends_on = [google_project_service.apis]
}
