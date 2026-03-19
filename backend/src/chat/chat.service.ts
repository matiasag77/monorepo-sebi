import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth, type IdTokenClient } from 'google-auth-library';

export interface AdkStructuredResponse {
  answer: string;
  context?: string | null;
  table?: Record<string, unknown>[] | null;
  chart?: Record<string, unknown> | null;
  proactivo?: string | null;
  intermediateSteps?: string[];
}

export interface ChatResponse {
  response: string;
  structured?: AdkStructuredResponse;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  private readonly adkUrl: string;
  private readonly appName: string;
  private authClient: IdTokenClient | null = null;
  private readonly useWIF: boolean;

  constructor(private readonly configService: ConfigService) {
    this.adkUrl =
      this.configService.get<string>('ADK_API_URL') ||
      this.configService.get<string>('SEBI_AGENT_URL') ||
      'https://adktestv1-367988788237.us-central1.run.app';
    this.appName = this.configService.get<string>('APP_NAME', 'SEBI');
    this.useWIF = this.configService.get<string>('USE_WORKLOAD_IDENTITY') === 'true';
    this.logger.log(`ChatService initialized - ADK URL configured: ${this.adkUrl ? 'YES' : 'NO (EMPTY!)'}`);
    this.logger.log(`ChatService - App name: ${this.appName}, WIF enabled: ${this.useWIF}`);
    if (this.adkUrl) {
      this.logger.log(`ADK URL: ${this.adkUrl}`);
      this.initAuthClient();
    } else {
      this.logger.error('ADK URL is empty or not configured! AI service will not work.');
    }
  }

  /**
   * Construye un GoogleAuth configurado para WIF (Workload Identity Federation)
   * usando el token de K8s IRSA para intercambio AWS→GCP.
   */
  private buildWIFGoogleAuth(): GoogleAuth {
    const audience = this.configService.get<string>('WORKLOAD_IDENTITY_AUDIENCE');
    const serviceAccountEmail = this.configService.get<string>(
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      'sebi-app-prod@forus-cl-ti-geminienterprise.iam.gserviceaccount.com',
    );
    const awsTokenFile =
      this.configService.get<string>('AWS_WEB_IDENTITY_TOKEN_FILE') ||
      '/var/run/secrets/eks.amazonaws.com/serviceaccount/token';

    if (!audience) {
      throw new Error('WORKLOAD_IDENTITY_AUDIENCE not configured. Check your configmap.');
    }

    return new GoogleAuth({
      credentials: {
        type: 'external_account',
        audience,
        subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
        token_url: 'https://sts.googleapis.com/v1/token',
        credential_source: {
          file: awsTokenFile,
        },
        service_account_impersonation_url:
          `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`,
      } as any,
    });
  }

  /**
   * Inicializa el cliente de autenticación de Google para Cloud Run.
   * Se cachea para reutilizar y refrescar tokens automáticamente.
   * En producción con WIF, usa ExternalAccountClient para el intercambio AWS→GCP.
   */
  private async initAuthClient(): Promise<void> {
    if (this.useWIF) {
      this.logger.log('Initializing auth client with Workload Identity Federation (WIF)...');
      try {
        const auth = this.buildWIFGoogleAuth();
        this.authClient = await auth.getIdTokenClient(this.adkUrl);
        this.logger.log('✓ WIF Auth client initialized successfully for Cloud Run ADK');
        return;
      } catch (error) {
        this.logger.error(`✗ WIF Auth client initialization failed: ${error instanceof Error ? error.message : error}`);
        this.logger.warn('Falling back to default GoogleAuth...');
      }
    }

    // Default path (non-WIF or WIF fallback)
    try {
      const auth = new GoogleAuth();
      this.authClient = await auth.getIdTokenClient(this.adkUrl);
      this.logger.log('Google Auth client initialized successfully for Cloud Run');
    } catch (error) {
      this.logger.warn(`Could not initialize Google Auth client (expected in local dev): ${error instanceof Error ? error.message : error}`);
      this.authClient = null;
    }
  }

  async sendMessage(
    message: string,
    userId?: string,
    sessionId?: string,
  ): Promise<ChatResponse> {
    this.logger.log(`sendMessage called - userId=${userId}, sessionId=${sessionId}, messageLength=${message?.length}`);
    const startTime = Date.now();
    const result = await this.sendToAdk(message, userId, sessionId);
    const duration = Date.now() - startTime;
    this.logger.log(`sendMessage completed in ${duration}ms - hasStructured=${!!result.structured}, responseLength=${result.response?.length}`);
    return result;
  }

  /**
   * Ensures the auth client is ready. Retries initialization if needed.
   */
  private async getAuthClient(): Promise<IdTokenClient | null> {
    if (this.authClient) {
      return this.authClient;
    }
    // Retry initialization in case it failed during constructor
    this.logger.log('Auth client not ready, retrying initialization...');

    if (this.useWIF) {
      try {
        const auth = this.buildWIFGoogleAuth();
        this.authClient = await auth.getIdTokenClient(this.adkUrl);
        this.logger.log('✓ WIF Auth client initialized on retry');
        return this.authClient;
      } catch (error) {
        this.logger.error(`WIF Auth client retry failed: ${error instanceof Error ? error.message : error}`);
        this.logger.warn('Falling back to default GoogleAuth on retry...');
      }
    }

    try {
      const auth = new GoogleAuth();
      this.authClient = await auth.getIdTokenClient(this.adkUrl);
      this.logger.log('Google Auth client initialized on retry');
      return this.authClient;
    } catch (error) {
      this.logger.warn(`Auth client retry failed: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  /**
   * Makes an authenticated request to Cloud Run using google-auth-library.
   * The client.request() method automatically handles token injection and refresh.
   */
  private async makeAuthenticatedRequest(
    url: string,
    options: { method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'; body?: string; timeout?: number },
  ): Promise<{ status: number; statusText: string; data: string; headers: Record<string, string> }> {
    const client = await this.getAuthClient();

    if (client) {
      this.logger.log(`Making authenticated request via GoogleAuth client - ${options.method} ${url}`);
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
        const data = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        this.logger.log(`Authenticated request success - status=${response.status}`);
        return {
          status: response.status,
          statusText: String(response.statusText || 'OK'),
          data,
          headers: response.headers as Record<string, string>,
        };
      } catch (error: unknown) {
        // google-auth-library throws GaxiosError with response info
        const gaxiosError = error as { response?: { status: number; statusText: string; data: unknown }; message?: string; stack?: string };
        if (gaxiosError.response) {
          const errorData = typeof gaxiosError.response.data === 'string'
            ? gaxiosError.response.data
            : JSON.stringify(gaxiosError.response.data);
          this.logger.error(`Authenticated request failed - status=${gaxiosError.response.status}, body=${errorData.substring(0, 500)}`);
          return {
            status: gaxiosError.response.status,
            statusText: String(gaxiosError.response.statusText || 'Error'),
            data: errorData,
            headers: {},
          };
        }
        // Network-level error (DNS, connection refused, etc.)
        this.logger.error(`Authenticated request network error: ${gaxiosError.message}`);
        this.logger.error(`Stack: ${gaxiosError.stack || 'N/A'}`);
        throw error;
      }
    }

    // Fallback: no auth client (local development)
    this.logger.warn(`No Google Auth client available - making unauthenticated request to ${url}`);
    const controller = new AbortController();
    const timeoutId = options.timeout ? setTimeout(() => controller.abort(), options.timeout) : null;
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
        headers: Object.fromEntries(res.headers.entries()),
      };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  /**
   * Inicializa una sesión en el ADK agent.
   */
  private async initAdkSession(
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const sessionUrl = `${this.adkUrl}/apps/${this.appName}/users/${userId}/sessions/${sessionId}`;
    this.logger.log(`initAdkSession - URL: ${sessionUrl}, userId=${userId}, sessionId=${sessionId}`);
    try {
      const res = await this.makeAuthenticatedRequest(sessionUrl, {
        method: 'POST',
        body: JSON.stringify({ preferred_language: 'Spanish' }),
      });
      this.logger.log(`ADK session init response: status=${res.status}, statusText=${res.statusText}`);
      if (res.status >= 400) {
        this.logger.warn(`ADK session init non-OK response body: ${res.data.substring(0, 500)}`);
      } else {
        this.logger.log(`ADK session init success - body length=${res.data.length}`);
      }
    } catch (error) {
      this.logger.error(`ADK session init FAILED: ${error instanceof Error ? error.message : error}`);
      this.logger.error(`ADK session init error stack: ${error instanceof Error ? error.stack : 'N/A'}`);
    }
  }

  /**
   * Parsea la respuesta SSE del ADK.
   * Extrae el answer final, table, chart, proactivo e intermediate steps.
   */
  private parseAdkSseResponse(responseText: string): AdkStructuredResponse {
    const lines = responseText
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => line.replace('data: ', '').trim());

    this.logger.log(`parseAdkSseResponse - total lines: ${responseText.split('\n').length}, data lines: ${lines.length}`);

    let finalAnswerData: Record<string, unknown> = {};
    const intermediateActions: string[] = [];
    let blockCount = 0;
    let parseErrorCount = 0;

    for (const jsonStr of lines) {
      try {
        blockCount++;
        const block = JSON.parse(jsonStr);
        const parts = block?.content?.parts ?? [];

        for (const part of parts) {
          // Intermediate step: agent calling a tool/sub-agent
          if (part.functionCall) {
            const toolName = part.functionCall.name ?? 'unknown';
            this.logger.log(`SSE block ${blockCount}: functionCall detected - tool=${toolName}`);
            intermediateActions.push(`Ejecutando: ${toolName}...`);
          }

          // Text response: parse inner JSON from the agent
          if (part.text) {
            const textContent: string = part.text;
            this.logger.log(`SSE block ${blockCount}: text part (length=${textContent.length}): ${textContent.substring(0, 200)}`);
            try {
              if (textContent.includes('{')) {
                const parsed = JSON.parse(textContent);
                // The last text block with parsed JSON is the final answer
                finalAnswerData = parsed;
                this.logger.log(`SSE block ${blockCount}: parsed JSON keys: ${Object.keys(parsed).join(', ')}`);
              }
            } catch {
              // Not JSON, use as plain text fallback
              if (!finalAnswerData['answer']) {
                finalAnswerData['answer'] = textContent;
                this.logger.log(`SSE block ${blockCount}: using text as plain fallback answer`);
              }
            }
          }
        }
      } catch {
        parseErrorCount++;
        this.logger.warn(`SSE block ${blockCount}: malformed JSON - ${jsonStr.substring(0, 200)}`);
        continue;
      }
    }

    this.logger.log(`parseAdkSseResponse summary - blocks=${blockCount}, parseErrors=${parseErrorCount}, intermediateSteps=${intermediateActions.length}`);
    this.logger.log(`parseAdkSseResponse - finalAnswer keys: ${Object.keys(finalAnswerData).join(', ') || '(none)'}`);

    return {
      answer:
        (finalAnswerData['answer'] as string) ?? 'Procesamiento completado.',
      context: (finalAnswerData['context'] as string) ?? null,
      table:
        (finalAnswerData['table'] as Record<string, unknown>[] | null) ?? null,
      chart:
        (finalAnswerData['chart'] as Record<string, unknown> | null) ?? null,
      proactivo: (finalAnswerData['proactivo'] as string) ?? null,
      intermediateSteps:
        intermediateActions.length > 0 ? intermediateActions : undefined,
    };
  }

  private async sendToAdk(
    message: string,
    userId?: string,
    sessionId?: string,
  ): Promise<ChatResponse> {
    const effectiveUserId = userId ?? 'sebi-user';
    const effectiveSessionId = sessionId ?? `session-${Date.now()}`;

    this.logger.log(`=== sendToAdk START ===`);
    this.logger.log(`ADK URL base: ${this.adkUrl || '(EMPTY!)'}`);
    this.logger.log(`User: ${effectiveUserId}, Session: ${effectiveSessionId}`);
    this.logger.log(`Message (first 200 chars): ${message?.substring(0, 200)}`);
    this.logger.log(`Auth client available: ${!!this.authClient}`);

    if (!this.adkUrl) {
      this.logger.error('ADK_API_URL is empty! Cannot proceed with AI request.');
      return {
        response:
          'Lo siento, el servicio de IA no está configurado. Contactá al administrador.',
      };
    }

    try {
      // 1. Initialize ADK session
      this.logger.log('Step 1: Initializing ADK session...');
      await this.initAdkSession(effectiveUserId, effectiveSessionId);

      // 2. Send message to ADK via /run_sse
      const runUrl = `${this.adkUrl}/run_sse`;
      const payload = {
        app_name: this.appName,
        user_id: effectiveUserId,
        session_id: effectiveSessionId,
        new_message: {
          role: 'user',
          parts: [{ text: message }],
        },
        streaming: false,
      };

      this.logger.log(`Step 2: Sending to ADK - URL: ${runUrl}`);
      this.logger.log(`Step 2: Payload: ${JSON.stringify(payload).substring(0, 500)}`);

      const fetchStartTime = Date.now();
      const res = await this.makeAuthenticatedRequest(runUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        timeout: 300000, // 5 min for ADK
      });
      const fetchDuration = Date.now() - fetchStartTime;

      this.logger.log(`ADK response received in ${fetchDuration}ms - status=${res.status}, statusText=${res.statusText}`);

      if (res.status >= 400) {
        this.logger.error(`ADK API error response - status=${res.status}, statusText=${res.statusText}`);
        this.logger.error(`ADK API error body (first 1000 chars): ${res.data.substring(0, 1000)}`);
        return {
          response:
            'Lo siento, no pude procesar tu consulta. Por favor, intentá de nuevo más tarde.',
        };
      }

      // 3. Parse SSE response
      const responseText = res.data;
      this.logger.log(`Step 3: ADK SSE response received - length=${responseText.length}`);
      this.logger.log(`ADK SSE response (first 500 chars): ${responseText.substring(0, 500)}`);

      const structured = this.parseAdkSseResponse(responseText);
      this.logger.log(`Parsed response - answer length=${structured.answer?.length}, hasTable=${!!structured.table}, hasChart=${!!structured.chart}, hasContext=${!!structured.context}, steps=${structured.intermediateSteps?.length ?? 0}`);
      this.logger.log(`=== sendToAdk END (success) ===`);

      return {
        response: structured.answer,
        structured,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error('=== sendToAdk END (TIMEOUT) === ADK API request timed out after 300s');
        return {
          response:
            'Lo siento, la consulta tardó demasiado. Por favor, intentá de nuevo más tarde.',
        };
      }
      this.logger.error(`=== sendToAdk END (ERROR) ===`);
      this.logger.error(`Error type: ${error?.constructor?.name}`);
      this.logger.error(`Error message: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.error(`Error stack: ${error instanceof Error ? error.stack : 'N/A'}`);
      if (error instanceof TypeError) {
        this.logger.error(`TypeError usually means: network error, DNS resolution failed, or invalid URL`);
        this.logger.error(`Check that ADK_API_URL (${this.adkUrl}) is reachable from this container/pod`);
      }
      return {
        response:
          'Lo siento, ocurrió un error al conectar con el servicio de IA. Por favor, intentá de nuevo más tarde.',
      };
    }
  }

  getSuggestedMessages(): string[] {
    return [
      '¿Cómo estuvieron las ventas del último trimestre?',
      'Muéstrame los KPIs del equipo comercial',
      '¿Hay alguna anomalía en los datos recientes?',
      'Genera un reporte de churn mensual',
      '¿Cuál es el forecast de revenue?',
      'Analiza el pipeline de datos',
      '¿Cómo va el rendimiento del equipo?',
      'Dame un resumen de la base de clientes',
    ];
  }
}
