# ─── Outputs ──────────────────────────────────────────────────────────

output "frontend_url" {
  description = "URL del frontend (Next.js)"
  value       = google_cloud_run_v2_service.frontend.uri
}

output "api_url" {
  description = "URL de la API BFF (NestJS)"
  value       = google_cloud_run_v2_service.api.uri
}

output "adk_url" {
  description = "URL interna del servicio ADK"
  value       = google_cloud_run_v2_service.adk.uri
}

output "artifact_registry" {
  description = "Repositorio de Artifact Registry"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/sebi-repo"
}

output "nat_ip" {
  description = "IP pública de Cloud NAT (agregar a whitelist de MongoDB Atlas)"
  value       = google_compute_address.sebi_nat_ip.address
}

output "vpc_connector" {
  description = "Nombre del VPC connector"
  value       = google_vpc_access_connector.sebi_connector.name
}
