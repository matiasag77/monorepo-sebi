# ─── Service Accounts ─────────────────────────────────────────────────

# API BFF service account
resource "google_service_account" "api_sa" {
  account_id   = "sebi-api-sa"
  display_name = "SEBI API BFF Service Account"
}

# Frontend service account
resource "google_service_account" "frontend_sa" {
  account_id   = "sebi-frontend-sa"
  display_name = "SEBI Frontend Service Account"
}

# Cloud Build service account
resource "google_service_account" "cloudbuild_sa" {
  account_id   = "sebi-cloudbuild-sa"
  display_name = "SEBI Cloud Build Service Account"
}

# ─── Roles para API BFF ──────────────────────────────────────────────

resource "google_project_iam_member" "api_bigquery_editor" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}

resource "google_project_iam_member" "api_bigquery_job" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}

resource "google_project_iam_member" "api_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}

# Permitir a api-bff invocar el Cloud Run del ADK (externo)
# Cloud Run Invoker: genera identity tokens para autenticarse contra el ADK
resource "google_project_iam_member" "api_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}

resource "google_project_iam_member" "api_logs_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}

resource "google_project_iam_member" "api_monitoring_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}

# ─── Roles para Frontend ─────────────────────────────────────────────

resource "google_project_iam_member" "frontend_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.frontend_sa.email}"
}

# ─── Roles para Cloud Build ──────────────────────────────────────────

resource "google_project_iam_member" "cloudbuild_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.cloudbuild_sa.email}"
}

resource "google_project_iam_member" "cloudbuild_artifact_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.cloudbuild_sa.email}"
}

resource "google_project_iam_member" "cloudbuild_sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.cloudbuild_sa.email}"
}

resource "google_project_iam_member" "cloudbuild_logs_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cloudbuild_sa.email}"
}
