import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  constructor(private readonly configService: ConfigService) {
    this.adkUrl = this.configService.get<string>('ADK_API_URL', '');
    this.logger.log(`ChatService initialized - ADK_API_URL configured: ${this.adkUrl ? 'YES' : 'NO (EMPTY!)'}`);
    if (this.adkUrl) {
      this.logger.log(`ADK_API_URL: ${this.adkUrl}`);
    } else {
      this.logger.error('ADK_API_URL is empty or not configured! AI service will not work.');
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
   * Genera un Google Identity Token para autenticarse contra Cloud Run.
   * En Cloud Run, la Service Account del backend tiene permiso Cloud Run Invoker.
   * En local, devuelve un token placeholder.
   */
  private async getIdentityToken(targetAudience: string): Promise<string> {
    this.logger.log(`getIdentityToken - targetAudience=${targetAudience}`);
    try {
      const { GoogleAuth } = await import('google-auth-library');
      const auth = new GoogleAuth();
      const client = await auth.getIdTokenClient(targetAudience);
      const headers = await client.getRequestHeaders();
      const token = headers['Authorization']?.replace('Bearer ', '');
      if (token) {
        this.logger.log(`Identity token generated successfully (length=${token.length})`);
        return token;
      }
      throw new Error('No token in headers');
    } catch (error) {
      this.logger.warn(
        `Could not generate identity token: ${error instanceof Error ? error.message : error}`,
      );
      this.logger.warn(`Token error stack: ${error instanceof Error ? error.stack : 'N/A'}`);
      this.logger.warn('Falling back to LOCAL_DEVELOPMENT_TOKEN');
      return 'LOCAL_DEVELOPMENT_TOKEN';
    }
  }

  /**
   * Inicializa una sesión en el ADK agent.
   */
  private async initAdkSession(
    token: string,
    userId: string,
    sessionId: string,
  ): Promise<void> {
    const sessionUrl = `${this.adkUrl}/apps/data_agent_app/users/${userId}/sessions/${sessionId}`;
    this.logger.log(`initAdkSession - URL: ${sessionUrl}`);
    this.logger.log(`initAdkSession - userId=${userId}, sessionId=${sessionId}, tokenType=${token === 'LOCAL_DEVELOPMENT_TOKEN' ? 'LOCAL' : 'GOOGLE_ID_TOKEN'}`);
    try {
      const res = await fetch(sessionUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferred_language: 'Spanish' }),
      });
      const responseBody = await res.text();
      this.logger.log(
        `ADK session init response: status=${res.status}, statusText=${res.statusText}`,
      );
      if (!res.ok) {
        this.logger.warn(`ADK session init non-OK response body: ${responseBody.substring(0, 500)}`);
      } else {
        this.logger.log(`ADK session init success - body length=${responseBody.length}`);
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000); // 5 min for ADK

    const effectiveUserId = userId ?? 'sebi-user';
    const effectiveSessionId = sessionId ?? `session-${Date.now()}`;

    this.logger.log(`=== sendToAdk START ===`);
    this.logger.log(`ADK URL base: ${this.adkUrl || '(EMPTY!)'}`);
    this.logger.log(`User: ${effectiveUserId}, Session: ${effectiveSessionId}`);
    this.logger.log(`Message (first 200 chars): ${message?.substring(0, 200)}`);

    if (!this.adkUrl) {
      this.logger.error('ADK_API_URL is empty! Cannot proceed with AI request.');
      return {
        response:
          'Lo siento, el servicio de IA no está configurado. Contactá al administrador.',
      };
    }

    try {
      // 1. Get identity token for Cloud Run authentication
      this.logger.log('Step 1: Getting identity token...');
      const token = await this.getIdentityToken(this.adkUrl);
      this.logger.log(`Token obtained: type=${token === 'LOCAL_DEVELOPMENT_TOKEN' ? 'LOCAL_DEV' : 'GOOGLE_ID'}`);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      // Only add Authorization header if we have a real token
      if (token !== 'LOCAL_DEVELOPMENT_TOKEN') {
        headers['Authorization'] = `Bearer ${token}`;
        this.logger.log('Authorization header added with Google ID token');
      } else {
        this.logger.warn('Using LOCAL_DEVELOPMENT_TOKEN - no Authorization header will be sent');
      }

      // 2. Initialize ADK session
      this.logger.log('Step 2: Initializing ADK session...');
      await this.initAdkSession(token, effectiveUserId, effectiveSessionId);

      // 3. Send message to ADK via /run_sse
      const runUrl = `${this.adkUrl}/run_sse`;
      const payload = {
        app_name: 'data_agent_app',
        user_id: effectiveUserId,
        session_id: effectiveSessionId,
        new_message: {
          role: 'user',
          parts: [{ text: message }],
        },
        streaming: false,
      };

      this.logger.log(`Step 3: Sending to ADK - URL: ${runUrl}`);
      this.logger.log(`Step 3: Payload: ${JSON.stringify(payload).substring(0, 500)}`);
      this.logger.log(`Step 3: Headers: ${JSON.stringify(Object.keys(headers))}`);

      const fetchStartTime = Date.now();
      const res = await fetch(runUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const fetchDuration = Date.now() - fetchStartTime;

      this.logger.log(`ADK response received in ${fetchDuration}ms - status=${res.status}, statusText=${res.statusText}`);
      this.logger.log(`ADK response headers: content-type=${res.headers.get('content-type')}, content-length=${res.headers.get('content-length')}`);

      if (!res.ok) {
        const errorBody = await res.text();
        this.logger.error(
          `ADK API error response - status=${res.status}, statusText=${res.statusText}`,
        );
        this.logger.error(`ADK API error body (first 1000 chars): ${errorBody.substring(0, 1000)}`);
        return {
          response:
            'Lo siento, no pude procesar tu consulta. Por favor, intentá de nuevo más tarde.',
        };
      }

      // 4. Parse SSE response
      const responseText = await res.text();
      this.logger.log(`Step 4: ADK SSE response received - length=${responseText.length}`);
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
    } finally {
      clearTimeout(timeout);
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
