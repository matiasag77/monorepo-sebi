# ─── VPC ──────────────────────────────────────────────────────────────
# Red privada para Cloud Run → MongoDB Atlas (IP fija via Cloud NAT)

resource "google_compute_network" "sebi_vpc" {
  name                    = "sebi-vpc"
  auto_create_subnetworks = false

  depends_on = [google_project_service.apis]
}

resource "google_compute_subnetwork" "sebi_subnet" {
  name          = "sebi-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.sebi_vpc.id
}

# ─── Serverless VPC Access Connector ─────────────────────────────────
# Permite a Cloud Run acceder a recursos dentro de la VPC

resource "google_vpc_access_connector" "sebi_connector" {
  name   = "sebi-connector"
  region = var.region

  subnet {
    name = google_compute_subnetwork.sebi_connector_subnet.name
  }

  min_instances = 2
  max_instances = 3

  depends_on = [google_project_service.apis]
}

# Subnet dedicada para el VPC connector (rango /28 requerido)
resource "google_compute_subnetwork" "sebi_connector_subnet" {
  name          = "sebi-connector-subnet"
  ip_cidr_range = "10.8.0.0/28"
  region        = var.region
  network       = google_compute_network.sebi_vpc.id
}

# ─── Cloud Router + Cloud NAT ────────────────────────────────────────
# IP de salida fija para whitelist en MongoDB Atlas

resource "google_compute_router" "sebi_router" {
  name    = "sebi-router"
  network = google_compute_network.sebi_vpc.id
  region  = var.region
}

resource "google_compute_address" "sebi_nat_ip" {
  name   = "sebi-nat-ip"
  region = var.region
}

resource "google_compute_router_nat" "sebi_nat" {
  name   = "sebi-nat"
  router = google_compute_router.sebi_router.name
  region = var.region

  nat_ip_allocate_option = "MANUAL_ONLY"
  nat_ips                = [google_compute_address.sebi_nat_ip.self_link]

  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.sebi_connector_subnet.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }
}
