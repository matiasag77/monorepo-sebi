import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth, type IdTokenClient } from 'google-auth-library';

/**
 * Resultado estandarizado de una petición HTTP autenticada hacia GCP.
 */
export interface GcpAuthenticatedResponse {
  status: number;
  statusText: string;
  data: string;
  headers: Record<string, string>;
}

/**
 * Servicio reutilizable para autenticación con GCP.
 *
 * Soporta tres modos de autenticación (en orden de prioridad):
 * 1. **WIF (Workload Identity Federation)**: para pods en EKS que necesitan acceder a GCP
 *    mediante el intercambio AWS OIDC → GCP STS → Service Account Impersonation.
 * 2. **Archivo JSON de Service Account**: para desarrollo local o entornos con credenciales explícitas.
 * 3. **Application Default Credentials (ADC)**: fallback automático de google-auth-library.
 *
 * Uso:
 * - Inyectar GcpAuthService en cualquier servicio que necesite hablar con GCP (Cloud Run, BigQuery, etc.).
 * - Para obtener un IdTokenClient:     `getIdTokenClient(targetAudience)`
 * - Para obtener un Access Token (WIF): `getAccessTokenWIF(scopes)`
 * - Para generar un ID Token (WIF):     `getIdTokenWIF(targetAudience)`
 * - Para hacer requests autenticados:   `makeAuthenticatedRequest(url, options)`
 * - Para obtener un ExternalAccountClient para BigQuery u otros SDKs: `getExternalAccountClient(scopes)`
 */
@Injectable()
export class GcpAuthService implements OnModuleInit {
  private readonly logger = new Logger(GcpAuthService.name);

  readonly useWIF: boolean;
  private readonly audience: string | undefined;
  private readonly serviceAccountEmail: string | undefined;
  private readonly awsTokenFile: string;
  private readonly keyFilename: string | undefined;

  /** Cache de IdTokenClient por audience/targetUrl */
  private idTokenClientCache = new Map<string, IdTokenClient>();

  constructor(private readonly configService: ConfigService) {
    this.useWIF = this.configService.get<string>('USE_WORKLOAD_IDENTITY') === 'true';
    this.audience = this.configService.get<string>('WORKLOAD_IDENTITY_AUDIENCE');
    this.serviceAccountEmail = this.configService.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    this.awsTokenFile =
      this.configService.get<string>('AWS_WEB_IDENTITY_TOKEN_FILE') ||
      '/var/run/secrets/eks.amazonaws.com/serviceaccount/token';
    this.keyFilename =
      this.configService.get<string>('BIGQUERY_KEY_FILE') ||
      this.configService.get<string>('GOOGLE_KEY_FILE');
  }

  async onModuleInit() {
    this.logger.log(`GcpAuthService initialized — WIF=${this.useWIF}, keyFile=${this.keyFilename || '(none)'}`);
    if (this.useWIF) {
      if (!this.audience || !this.serviceAccountEmail) {
        this.logger.warn(
          'WIF enabled but WORKLOAD_IDENTITY_AUDIENCE or GOOGLE_SERVICE_ACCOUNT_EMAIL missing. Auth calls will fail.',
        );
      } else {
        this.logger.log(`WIF audience: ${this.audience}`);
        this.logger.log(`WIF service account: ${this.serviceAccountEmail}`);
      }
    }
  }

  // ─── WIF helpers ───────────────────────────────────────────────────────────

  /**
   * Configuración base para ExternalAccountClient (WIF).
   */
  private getExternalAccountConfig() {
    if (!this.audience || !this.serviceAccountEmail) {
      throw new Error(
        'WIF configuration incomplete: WORKLOAD_IDENTITY_AUDIENCE and GOOGLE_SERVICE_ACCOUNT_EMAIL are required.',
      );
    }
    return {
      type: 'external_account' as const,
      audience: this.audience,
      subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
      token_url: 'https://sts.googleapis.com/v1/token',
      credential_source: { file: this.awsTokenFile },
      service_account_impersonation_url:
        `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${this.serviceAccountEmail}:generateAccessToken`,
    };
  }

  /**
   * Crea un ExternalAccountClient para uso con SDKs de GCP (BigQuery, Storage, etc.).
   * El caller debe asignar `scopes` antes de usarlo.
   *
   * @example
   * const client = await gcpAuth.getExternalAccountClient(['https://www.googleapis.com/auth/bigquery']);
   * const bq = new BigQuery({ authClient: client });
   */
  async getExternalAccountClient(scopes: string[]): Promise<any> {
    if (!this.useWIF) {
      throw new Error('getExternalAccountClient() is only available when WIF is enabled.');
    }
    const { ExternalAccountClient } = await import('google-auth-library');
    const config = this.getExternalAccountConfig();
    const client = ExternalAccountClient.fromJSON(config) as any;
    if (!client) {
      throw new Error('Failed to create ExternalAccountClient from WIF config.');
    }
    client.scopes = scopes;
    this.logger.log(`ExternalAccountClient created with scopes: ${scopes.join(', ')}`);
    return client;
  }

  /**
   * Genera un ID Token mediante WIF para autenticar contra Cloud Run u otros servicios.
   *
   * Flujo:
   * 1. Usa el JWT del pod (OIDC) para obtener un Access Token impersonando la SA via ExternalAccountClient.
   * 2. Usa ese Access Token para llamar a `iamcredentials.googleapis.com/generateIdToken`.
   *
   * @param targetAudience - La URL base del servicio destino (ej: https://my-service-xxxx.run.app)
   */
  async getIdTokenWIF(targetAudience: string): Promise<string> {
    if (!this.useWIF) {
      throw new Error('getIdTokenWIF() is only available when WIF is enabled.');
    }

    const { ExternalAccountClient } = await import('google-auth-library');
    const config = this.getExternalAccountConfig();
    const authClient = ExternalAccountClient.fromJSON(config) as any;

    // 1. Obtener Access Token via WIF
    const accessTokenResponse = await authClient.getAccessToken();
    const accessToken = accessTokenResponse.token;

    // 2. Generar ID Token para Cloud Run
    const generateIdTokenUrl =
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${this.serviceAccountEmail}:generateIdToken`;

    const res = await fetch(generateIdTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        audience: targetAudience,
        includeEmail: true,
      }),
    });

    if (!res.ok) {
      const errorData = await res.text();
      throw new Error(`generateIdToken failed: ${res.status} ${errorData}`);
    }

    const data = await res.json();
    return data.token;
  }

  // ─── IdTokenClient (non-WIF) ──────────────────────────────────────────────

  /**
   * Obtiene un IdTokenClient para un target audience dado.
   * Se cachea para reutilizar y refrescar tokens automáticamente.
   *
   * En modo WIF, retorna null (usar `getIdTokenWIF()` o `makeAuthenticatedRequest()`).
   */
  async getIdTokenClient(targetAudience: string): Promise<IdTokenClient | null> {
    if (this.useWIF) {
      return null; // WIF usa getIdTokenWIF() directamente
    }

    const cached = this.idTokenClientCache.get(targetAudience);
    if (cached) return cached;

    try {
      const authOptions = this.keyFilename ? { keyFile: this.keyFilename } : undefined;
      const auth = new GoogleAuth(authOptions);
      const client = await auth.getIdTokenClient(targetAudience);
      this.idTokenClientCache.set(targetAudience, client);
      this.logger.log(
        `IdTokenClient created for ${targetAudience} ${this.keyFilename ? '(JSON key file)' : '(ADC)'}`,
      );
      return client;
    } catch (error) {
      this.logger.warn(
        `Could not create IdTokenClient for ${targetAudience}: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  // ─── High-level request helper ─────────────────────────────────────────────

  /**
   * Realiza una petición HTTP autenticada hacia un servicio GCP (Cloud Run, etc.).
   *
   * - Con WIF: genera un ID Token manualmente y lo inyecta como Bearer.
   * - Sin WIF: usa el IdTokenClient de google-auth-library que maneja refresh automáticamente.
   * - Sin credenciales: hace la request sin auth (útil en desarrollo local).
   */
  async makeAuthenticatedRequest(
    url: string,
    options: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      body?: string;
      timeout?: number;
    },
  ): Promise<GcpAuthenticatedResponse> {
    // ── WIF path ──
    if (this.useWIF) {
      this.logger.log(`Authenticated request via WIF — ${options.method} ${url}`);
      const urlObj = new URL(url);
      const targetAudience = `${urlObj.protocol}//${urlObj.host}`;
      const idToken = await this.getIdTokenWIF(targetAudience);

      const controller = new AbortController();
      const timeoutId = options.timeout
        ? setTimeout(() => controller.abort(), options.timeout)
        : null;

      try {
        const res = await fetch(url, {
          method: options.method,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: options.body,
          signal: controller.signal,
        });

        const data = await res.text();
        this.logger.log(`WIF request success — status=${res.status}`);
        return {
          status: res.status,
          statusText: res.statusText,
          data,
          headers: Object.fromEntries((res.headers as any).entries()),
        };
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }

    // ── IdTokenClient path ──
    const urlObj = new URL(url);
    const targetAudience = `${urlObj.protocol}//${urlObj.host}`;
    const client = await this.getIdTokenClient(targetAudience);

    if (client) {
      this.logger.log(`Authenticated request via IdTokenClient — ${options.method} ${url}`);
      try {
        const response = await client.request({
          url,
          method: options.method,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: options.body,
          timeout: options.timeout,
        });
        const data =
          typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        this.logger.log(`IdTokenClient request success — status=${response.status}`);
        return {
          status: response.status,
          statusText: String(response.statusText || 'OK'),
          data,
          headers: response.headers as Record<string, string>,
        };
      } catch (error: unknown) {
        const gaxiosError = error as {
          response?: { status: number; statusText: string; data: unknown };
          message?: string;
          stack?: string;
        };
        if (gaxiosError.response) {
          const errorData =
            typeof gaxiosError.response.data === 'string'
              ? gaxiosError.response.data
              : JSON.stringify(gaxiosError.response.data);
          this.logger.error(
            `Request failed — status=${gaxiosError.response.status}, body=${errorData.substring(0, 500)}`,
          );
          return {
            status: gaxiosError.response.status,
            statusText: String(gaxiosError.response.statusText || 'Error'),
            data: errorData,
            headers: {},
          };
        }
        this.logger.error(`Network error: ${gaxiosError.message}`);
        throw error;
      }
    }

    // ── Unauthenticated fallback (local dev) ──
    this.logger.warn(`No auth available — unauthenticated request to ${url}`);
    const controller = new AbortController();
    const timeoutId = options.timeout
      ? setTimeout(() => controller.abort(), options.timeout)
      : null;
    try {
      const res = await fetch(url, {
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: options.body,
        signal: controller.signal,
      });
      const data = await res.text();
      return {
        status: res.status,
        statusText: res.statusText,
        data,
        headers: Object.fromEntries((res.headers as any).entries()),
      };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
}
