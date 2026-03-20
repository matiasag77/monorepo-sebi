import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GcpAuthService } from '../gcp-auth/gcp-auth.service';

export interface AdkStructuredResponse {
  answer: string;
  context?: string | null;
  table?: Record<string, unknown>[] | null;
  chart?: Record<string, unknown> | null;
  proactivo?: string | null;
  intermediateSteps?: string[];
}

export interface SebiAdkResponse {
  answer: string;
  context?: string | null;
  tables: Record<string, unknown>[];
  intermediate_steps: string[];
  session_id: string;
  confidence: number;
  sources: string[];
  follow_up_questions: string[];
}

export interface ChatResponse {
  response: string;
  structured?: AdkStructuredResponse;
  fallbackUsed?: boolean;
  adkError?: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  private readonly adkUrl: string;
  private readonly appName: string;
  private readonly fallbackApiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly gcpAuth: GcpAuthService,
  ) {
    this.adkUrl =
      this.configService.get<string>('ADK_API_URL') ||
      this.configService.get<string>('SEBI_AGENT_URL') ||
      'https://adktestv1-367988788237.us-central1.run.app';
    this.appName = this.configService.get<string>('APP_NAME', 'SEBI');
    this.fallbackApiUrl =
      this.configService.get<string>('FALLBACK_API_URL') ||
      'https://skelligen-api.prod.interno.forus-sistemas.com/api/test-ai';
    this.logger.log(`ChatService initialized — ADK URL: ${this.adkUrl || '(EMPTY!)'}`);
    this.logger.log(`ChatService — App: ${this.appName}, WIF: ${this.gcpAuth.useWIF}`);
    this.logger.log(`ChatService — Fallback URL: ${this.fallbackApiUrl}`);
  }

  async sendMessage(
    message: string,
    userId?: string,
    sessionId?: string,
  ): Promise<ChatResponse> {
    this.logger.log(`sendMessage called — userId=${userId}, sessionId=${sessionId}, len=${message?.length}`);
    const startTime = Date.now();
    const result = await this.sendToAdk(message, userId, sessionId);
    this.logger.log(`sendMessage completed in ${Date.now() - startTime}ms`);
    return result;
  }

  /**
   * Inicializa una sesión en el ADK agent.
   */
  private async initAdkSession(userId: string, sessionId: string): Promise<void> {
    const sessionUrl = `${this.adkUrl}/apps/${this.appName}/users/${userId}/sessions/${sessionId}`;
    this.logger.log(`initAdkSession — ${sessionUrl}`);
    try {
      const res = await this.gcpAuth.makeAuthenticatedRequest(sessionUrl, {
        method: 'POST',
        body: JSON.stringify({ preferred_language: 'Spanish' }),
      });
      this.logger.log(`ADK session init — status=${res.status}`);
      if (res.status >= 400) {
        this.logger.warn(`ADK session init non-OK: ${res.data.substring(0, 500)}`);
      }
    } catch (error) {
      this.logger.error(`ADK session init FAILED: ${error instanceof Error ? error.message : error}`);
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

    this.logger.log(`parseAdkSseResponse — data lines: ${lines.length}`);

    let finalAnswerData: Record<string, unknown> = {};
    const intermediateActions: string[] = [];

    for (const jsonStr of lines) {
      try {
        const block = JSON.parse(jsonStr);
        const parts = block?.content?.parts ?? [];

        for (const part of parts) {
          if (part.functionCall) {
            const toolName = part.functionCall.name ?? 'unknown';
            intermediateActions.push(`Ejecutando: ${toolName}...`);
          }

          if (part.text) {
            const textContent: string = part.text;
            try {
              if (textContent.includes('{')) {
                finalAnswerData = JSON.parse(textContent);
              }
            } catch {
              if (!finalAnswerData['answer']) {
                finalAnswerData['answer'] = textContent;
              }
            }
          }
        }
      } catch {
        continue;
      }
    }

    return {
      answer: (finalAnswerData['answer'] as string) ?? 'Procesamiento completado.',
      context: (finalAnswerData['context'] as string) ?? null,
      table: (finalAnswerData['table'] as Record<string, unknown>[] | null) ?? null,
      chart: (finalAnswerData['chart'] as Record<string, unknown> | null) ?? null,
      proactivo: (finalAnswerData['proactivo'] as string) ?? null,
      intermediateSteps: intermediateActions.length > 0 ? intermediateActions : undefined,
    };
  }

  /**
   * Llama a la API de fallback (Skelligen test-ai) cuando ADK falla.
   */
  private async sendToFallbackApi(message: string): Promise<ChatResponse> {
    this.logger.log(`sendToFallbackApi — URL: ${this.fallbackApiUrl}`);
    try {
      const res = await fetch(this.fallbackApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ prompt: message }),
        signal: AbortSignal.timeout(60000),
      });

      const data = await res.json();
      if (res.ok && data?.success && data?.data?.response) {
        return { response: data.data.response, fallbackUsed: true };
      }

      this.logger.error(`Fallback unexpected response: ${JSON.stringify(data).substring(0, 500)}`);
      return {
        response: 'No fue posible procesar tu consulta en este momento. Por favor, intenta de nuevo más tarde.',
        fallbackUsed: true,
      };
    } catch (error) {
      this.logger.error(`Fallback also failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        response: 'Los servicios de IA se encuentran temporalmente no disponibles. Por favor, intenta de nuevo más tarde.',
        fallbackUsed: true,
      };
    }
  }

  private async sendToAdk(
    message: string,
    userId?: string,
    sessionId?: string,
  ): Promise<ChatResponse> {
    const effectiveUserId = userId ?? 'sebi-user';
    const effectiveSessionId = sessionId ?? `session-${Date.now()}`;

    this.logger.log(`sendToAdk — user=${effectiveUserId}, session=${effectiveSessionId}`);

    if (!this.adkUrl) {
      this.logger.error('ADK_API_URL is empty!');
      const fallback = await this.sendToFallbackApi(message);
      fallback.adkError = 'ADK_API_URL no está configurada.';
      return fallback;
    }

    try {
      // 1. Initialize ADK session
      await this.initAdkSession(effectiveUserId, effectiveSessionId);

      // 2. Send message to ADK via /run_sse
      const runUrl = `${this.adkUrl}/run_sse`;
      const payload = {
        app_name: this.appName,
        user_id: effectiveUserId,
        session_id: effectiveSessionId,
        new_message: { role: 'user', parts: [{ text: message }] },
        streaming: false,
      };

      this.logger.log(`Sending to ADK — ${runUrl}`);
      const fetchStart = Date.now();
      const res = await this.gcpAuth.makeAuthenticatedRequest(runUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        timeout: 300000,
      });
      this.logger.log(`ADK response in ${Date.now() - fetchStart}ms — status=${res.status}`);

      if (res.status >= 400) {
        const adkErrorMsg = `ADK API error — status=${res.status}`;
        this.logger.error(`${adkErrorMsg}, body: ${res.data.substring(0, 1000)}`);
        const fallback = await this.sendToFallbackApi(message);
        fallback.adkError = adkErrorMsg;
        return fallback;
      }

      // 3. Parse SSE response
      const structured = this.parseAdkSseResponse(res.data);
      this.logger.log(`Parsed — answer=${structured.answer?.length} chars, table=${!!structured.table}, chart=${!!structured.chart}`);

      return { response: structured.answer, structured };
    } catch (error) {
      let adkErrorMsg: string;
      if (error instanceof Error && error.name === 'AbortError') {
        adkErrorMsg = 'ADK API request timed out after 300s';
      } else {
        adkErrorMsg = `ADK error: ${error instanceof Error ? error.message : String(error)}`;
        this.logger.error(adkErrorMsg);
        if (error instanceof TypeError) {
          this.logger.error(`Check that ADK_API_URL (${this.adkUrl}) is reachable`);
        }
      }
      const fallback = await this.sendToFallbackApi(message);
      fallback.adkError = adkErrorMsg;
      return fallback;
    }
  }

  /**
   * Parsea la respuesta SSE del ADK con el formato completo esperado por el frontend SEBI.
   * Acumula tablas de todos los bloques, extrae answer, context, confidence, sources y follow_up_questions.
   */
  private parseAdkSseResponseSebi(responseText: string, sessionId: string): SebiAdkResponse {
    const lines = responseText
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => line.replace('data: ', '').trim());

    this.logger.log(`[SEBI] parseAdkSseResponseSebi — total data lines: ${lines.length}`);
    this.logger.debug(`[SEBI] Raw ADK response (first 2000 chars):\n${responseText.substring(0, 2000)}`);

    const allTables: Record<string, unknown>[] = [];
    const intermediateActions: string[] = [];
    let finalAnswerData: Record<string, unknown> = {};

    for (let idx = 0; idx < lines.length; idx++) {
      const jsonStr = lines[idx];
      try {
        const block = JSON.parse(jsonStr);
        this.logger.debug(`[SEBI] Block[${idx}] author=${block?.author} type=${block?.content?.role}`);

        const parts = block?.content?.parts ?? [];

        for (const part of parts) {
          if (part.functionCall) {
            const toolName = part.functionCall.name ?? 'unknown';
            this.logger.log(`[SEBI] Tool call detected: ${toolName}`);
            intermediateActions.push(`Ejecutando: ${toolName}...`);
          }

          if (part.text) {
            const textContent: string = part.text;
            this.logger.debug(`[SEBI] Text part (${textContent.length} chars): ${textContent.substring(0, 300)}`);
            try {
              if (textContent.includes('{')) {
                const parsed = JSON.parse(textContent);
                // Accumulate tables from every block
                if (parsed.tables && Array.isArray(parsed.tables)) {
                  this.logger.log(`[SEBI] Tables found in block[${idx}]: ${parsed.tables.length} rows`);
                  allTables.push(...parsed.tables);
                }
                finalAnswerData = parsed;
              }
            } catch {
              if (!finalAnswerData['answer']) {
                finalAnswerData['answer'] = textContent;
              }
            }
          }
        }
      } catch {
        this.logger.warn(`[SEBI] Could not parse block[${idx}]: ${jsonStr.substring(0, 100)}`);
        continue;
      }
    }

    const answer = (finalAnswerData['answer'] as string) ?? 'Procesamiento completado.';
    const confidence = (finalAnswerData['confidence'] as number) ?? 1.0;
    const sources = (finalAnswerData['sources'] as string[]) ?? [];
    const followUpQuestions = (finalAnswerData['follow_up_questions'] as string[]) ?? [];
    const context = (finalAnswerData['context'] as string) ?? null;

    this.logger.log(
      `[SEBI] Parsed result — answer: ${answer.length} chars, tables: ${allTables.length}, steps: ${intermediateActions.length}, confidence: ${confidence}`,
    );

    return {
      answer,
      context,
      tables: allTables,
      intermediate_steps: intermediateActions,
      session_id: sessionId,
      confidence,
      sources,
      follow_up_questions: followUpQuestions,
    };
  }

  /**
   * Método público para el endpoint /v1/chat_sebi.
   * Sigue la misma lógica que el backend Python: inicializa sesión, llama run_sse, parsea SSE.
   */
  async sendMessageSebi(
    message: string,
    userId?: string,
    sessionId?: string,
    email?: string,
  ): Promise<SebiAdkResponse> {
    const effectiveUserId = userId ?? 'sebi-user';
    const effectiveSessionId = sessionId ?? `session-${Date.now()}`;

    this.logger.log(
      `[SEBI] sendMessageSebi — user=${effectiveUserId}, email=${email ?? 'N/A'}, session=${effectiveSessionId}, msgLen=${message?.length}`,
    );
    const startTime = Date.now();

    if (!this.adkUrl) {
      this.logger.error('[SEBI] ADK_API_URL is empty — cannot process request');
      return {
        answer: 'El servicio ADK no está configurado. Contacta al administrador.',
        tables: [],
        intermediate_steps: [],
        session_id: effectiveSessionId,
        confidence: 0,
        sources: [],
        follow_up_questions: [],
      };
    }

    try {
      // 1. Initialize ADK session
      await this.initAdkSession(effectiveUserId, effectiveSessionId);

      // 2. Build payload (matching Python backend)
      const runUrl = `${this.adkUrl}/run_sse`;
      const payload = {
        app_name: this.appName,
        user_id: effectiveUserId,
        session_id: effectiveSessionId,
        new_message: { role: 'user', parts: [{ text: message }] },
        streaming: false,
        state: {
          session_id: effectiveSessionId,
          user_prompt: message,
          user_email: email ?? '',
        },
      };

      this.logger.log(`[SEBI] Calling ADK run_sse — ${runUrl}`);
      this.logger.debug(`[SEBI] Payload: ${JSON.stringify(payload)}`);

      const fetchStart = Date.now();
      const res = await this.gcpAuth.makeAuthenticatedRequest(runUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        timeout: 300000,
      });

      this.logger.log(`[SEBI] ADK responded in ${Date.now() - fetchStart}ms — status=${res.status}`);
      this.logger.log(`[SEBI] ADK response size: ${res.data?.length ?? 0} bytes`);

      if (res.status >= 400) {
        this.logger.error(`[SEBI] ADK error status=${res.status}, body: ${res.data?.substring(0, 500)}`);
        return {
          answer: `Error al conectar con el agente SEBI (HTTP ${res.status}). Intenta nuevamente.`,
          tables: [],
          intermediate_steps: [],
          session_id: effectiveSessionId,
          confidence: 0,
          sources: [],
          follow_up_questions: [],
        };
      }

      // 3. Parse SSE response with full SEBI format
      const result = this.parseAdkSseResponseSebi(res.data, effectiveSessionId);
      this.logger.log(`[SEBI] sendMessageSebi completed in ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[SEBI] sendMessageSebi FAILED: ${errMsg}`);
      return {
        answer: 'Ocurrió un error al procesar tu consulta. Por favor, intenta de nuevo.',
        tables: [],
        intermediate_steps: [],
        session_id: effectiveSessionId,
        confidence: 0,
        sources: [],
        follow_up_questions: [],
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
