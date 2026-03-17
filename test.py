"""
Explorador de Datasets BigQuery
Datasets: data_ia | data_ia_gold | test_logs
Proyecto: forus-cl-ti-geminienterprise
"""

import sys

def install_deps():
    import subprocess
    for pkg in ["google-cloud-bigquery", "google-auth"]:
        subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"])

try:
    from google.oauth2 import service_account
    from google.cloud import bigquery
except ImportError:
    print("📦 Instalando dependencias...")
    install_deps()
    from google.oauth2 import service_account
    from google.cloud import bigquery


# ── Credenciales ─────────────────────────────────────────────────────────────
CREDENTIALS_INFO = {
    "type": "service_account",
    "project_id": "forus-cl-ti-geminienterprise",
    "private_key_id": "80a60a49f66bdbd63d2c53bcadf2eabee0ce1191",
    "private_key": (
        "-----BEGIN PRIVATE KEY-----\n"
        "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDl72FRxGvnOMWb\n"
        "TEdaacYryWkzVOlesCOrelNxiyHheVwpOsHJUbsfE7aSDhXQlA98vBC+CYjgbk/b\n"
        "pJNfj++PZ9TnNTYIO4Y9u/erG+vA+T4fgIHSDeGNQ2kWTadTa266sKXynxtxzg3i\n"
        "OUSMVXBaiEUOohYpnBVgNB/e37hGXvNOk+Z3IjDLmg4HScgoE5q16sNJOkG6QiZS\n"
        "HOhAPb4x+bfhXuLpy4mzMSErKyyyunqbXMMKefhO6K6rOYge7aUsGqK2Rrqt2phd\n"
        "4uoaGNdHWkGrWNnk94NZqlvfqytfIKozZxlUVgPZXE18PM0TLd4FwfrwACGiMSCF\n"
        "xCg9dd7ZAgMBAAECggEAHHnGG2aAN3k2LbqnXojZcDxIEUGbiiy1qiui0F268y3A\n"
        "rmF2tNwwmJNsKY/hfzyK43d1+lb7ctHuhWTPFIdik2e4O+8A00mt4RDZhgEV9AbZ\n"
        "/PRA/5bU/1XhGpBA3+me47NzRcYTE8fBO+o8NUXyfV/Bb6O+q2YHVqv143fg3iPx\n"
        "keHjXnnnFj+VoFJcDdtkMYfzfkRz/cDrjFWXbHpVhAQQuhVA4golqZDAvn4EimXE\n"
        "orBRPA0M9ZpT4P/ZitUh8yjxdql9iNXTqTsgk0UJBGuLMcCkLYRdrJ6dhb+nCek1\n"
        "K+DWxsAoq+vknwSp6djW1q/09Cb3pTlu3G6O8TYM4QKBgQD34gHcVJjqraWtFG/9\n"
        "j32416S/6FxUPP8McY7EEBpVRpseRdWT6nkY7K0HncJ5ENs+EqthsfnVX1DwyHXS\n"
        "QhhK2yGMet1N6kMIZv8xKbuVgVwJxBpI/g1TWS5qXJFNn/B8Ff7FCwieIg6AL5FX\n"
        "yV0JBP3mb4vqZXyFcbP5BntDqQKBgQDtdureZhcDIi8Ew2GI62JRZupQHMMkAquc\n"
        "3JWf1kilHQ+UnIXM9yrljT82AMu/1W7SKTvJmFT0osOTzIU5nUFz81A7iN8n4e59\n"
        "xVwrnKQvYM4zUganGjM9ZlCt9kkhVKoL79BRNUyQXZ79JKJoaT820BZ8caHCqzud\n"
        "/gqzPVm/sQKBgHP2bA5qGRt4XtBIhlelgBgv8afBiSfzXRGyMiqwqdEI9dpEqzTG\n"
        "dR5e4ld0yxyd8SLp0vkiLJFQROpPrSbOutSSDPDOLaeclv1gSbPzJQk8+hSrg+xv\n"
        "xUYfq2Igqe0ZjIRQOd5uWfq4TfZTyne6AOcOScU6m8bs8ULwPVSbXqD5AoGAW4El\n"
        "hEnGuFhl0eoQHZjGrCOCSxiqQagdxTZjGdKS771BEb02+gKMryQ8pWytFuEB8U4e\n"
        "UdK3egV2Y++9rrPgUvQBiM93XoD7S8/PcqbLxc4B51jGY4H/GLvifwaWq5daZ3sj\n"
        "xQdK156b82Q4iQ91YoPRBmcrND6TnJAWQ3dyrCECgYEAkDa56qNpDWXLfrP8EYI/\n"
        "HzP4Huv8YAfx4xucc9RnZpVO7h3en/NkyL7VJzmiiWJxdTdaYppRCssU4C9qzrRI\n"
        "xDgIHREtwzQibNr5elX+QgrnKQe/ZnX4f3hMDQYn92fRlcFOZouOG9RqxZFJoGxp\n"
        "KqUoc1hRD3WEUkCHjdigImY=\n"
        "-----END PRIVATE KEY-----\n"
    ),
    "client_email": "adk-api-backend-sa@forus-cl-ti-geminienterprise.iam.gserviceaccount.com",
    "client_id": "103790421355820785904",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/adk-api-backend-sa%40forus-cl-ti-geminienterprise.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
}

PROJECT_ID = CREDENTIALS_INFO["project_id"]
DATASETS   = ["data_ia", "data_ia_gold", "test_logs"]
PREVIEW_ROWS = 3   # filas de preview por tabla


# ── Utilidades de impresión ──────────────────────────────────────────────────
def header(text):
    bar = "═" * 60
    print(f"\n{bar}\n  {text}\n{bar}")

def subheader(text):
    print(f"\n  ┌─ {text}")

def info(text):
    print(f"  │  {text}")

def ok(text):
    print(f"  │  ✅ {text}")

def err(text):
    print(f"  │  ❌ {text}")

def close():
    print(f"  └{'─'*50}")


# ── Conexión ─────────────────────────────────────────────────────────────────
def get_client():
    scopes = ["https://www.googleapis.com/auth/bigquery"]
    creds  = service_account.Credentials.from_service_account_info(
        CREDENTIALS_INFO, scopes=scopes
    )
    return bigquery.Client(project=PROJECT_ID, credentials=creds)


# ── Explorar un dataset ───────────────────────────────────────────────────────
def explore_dataset(client: bigquery.Client, dataset_id: str):
    header(f"📂  DATASET: {dataset_id}")

    # -- Listar tablas --------------------------------------------------------
    try:
        tables = list(client.list_tables(dataset_id))
    except Exception as e:
        err(f"No se pudo acceder al dataset: {e}")
        return

    if not tables:
        info("Dataset vacío (sin tablas)")
        return

    info(f"Tablas encontradas: {len(tables)}")

    for table_ref in tables:
        table_id   = table_ref.table_id
        full_table = f"{PROJECT_ID}.{dataset_id}.{table_id}"

        subheader(f"Tabla: {table_id}")

        # -- Metadata de la tabla ---------------------------------------------
        try:
            table = client.get_table(full_table)
            info(f"Tipo        : {table.table_type}")
            info(f"Filas aprox.: {table.num_rows:,}" if table.num_rows is not None else "Filas aprox.: N/A")
            info(f"Tamaño      : {round(table.num_bytes / 1024 / 1024, 2)} MB" if table.num_bytes else "Tamaño: N/A")
            info(f"Creada      : {table.created}")
            info(f"Modificada  : {table.modified}")

            # -- Schema -------------------------------------------------------
            if table.schema:
                info(f"Schema ({len(table.schema)} columnas):")
                for field in table.schema:
                    mode = f"[{field.mode}]" if field.mode != "NULLABLE" else ""
                    info(f"    • {field.name:<30} {field.field_type:<12} {mode}")

        except Exception as e:
            err(f"Error metadata: {e}")

        # -- Preview de datos -------------------------------------------------
        try:
            query   = f"SELECT * FROM `{full_table}` LIMIT {PREVIEW_ROWS}"
            rows    = list(client.query(query).result())
            if rows:
                info(f"Preview ({len(rows)} filas):")
                # Header de columnas
                cols = [field.name for field in rows[0]._xxx_field_to_index]  # fallback
                try:
                    cols = list(rows[0].keys())
                except Exception:
                    pass
                info("    " + " | ".join(f"{c[:18]:<18}" for c in cols))
                info("    " + "-" * (22 * len(cols)))
                for row in rows:
                    values = [str(row[c])[:18] for c in cols]
                    info("    " + " | ".join(f"{v:<18}" for v in values))
            else:
                info("Tabla sin datos aún")
        except Exception as e:
            err(f"Error al leer datos: {e}")

        close()


# ── INFORMATION_SCHEMA (resumen SQL por dataset) ─────────────────────────────
def query_information_schema(client: bigquery.Client, dataset_id: str):
    subheader(f"INFORMATION_SCHEMA · {dataset_id}")
    query = f"""
        SELECT
            table_name,
            table_type,
            creation_time,
            row_count,
            size_bytes
        FROM `{PROJECT_ID}.{dataset_id}.INFORMATION_SCHEMA.TABLE_STORAGE`
        ORDER BY size_bytes DESC
    """
    try:
        rows = list(client.query(query).result())
        if rows:
            info(f"{'Tabla':<35} {'Tipo':<15} {'Filas':>10} {'MB':>8}")
            info("-" * 72)
            for r in rows:
                mb = round(r.size_bytes / 1024 / 1024, 2) if r.size_bytes else 0
                info(f"{r.table_name:<35} {r.table_type:<15} {r.row_count or 0:>10,} {mb:>8.2f}")
        else:
            info("Sin datos en INFORMATION_SCHEMA")
    except Exception as e:
        err(f"INFORMATION_SCHEMA no disponible: {e}")
    close()


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    print("\n" + "█" * 60)
    print("  EXPLORADOR DE DATASETS — BigQuery")
    print(f"  Proyecto : {PROJECT_ID}")
    print(f"  Datasets : {', '.join(DATASETS)}")
    print("█" * 60)

    try:
        client = get_client()
        print(f"\n✅  Conexión establecida con BigQuery")
    except Exception as e:
        print(f"\n❌  No se pudo conectar: {e}")
        sys.exit(1)

    for ds in DATASETS:
        explore_dataset(client, ds)
        query_information_schema(client, ds)

    print("\n" + "█" * 60)
    print("  Exploración completada")
    print("█" * 60 + "\n")


if __name__ == "__main__":
    main()