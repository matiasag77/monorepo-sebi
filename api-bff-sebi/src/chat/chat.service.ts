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
  }

  async sendMessage(
    message: string,
    userId?: string,
    sessionId?: string,
  ): Promise<ChatResponse> {
    return this.sendToAdk(message, userId, sessionId);
  }

  /**
   * Genera un Google Identity Token para autenticarse contra Cloud Run.
   * En Cloud Run, la Service Account del backend tiene permiso Cloud Run Invoker.
   * En local, devuelve un token placeholder.
   */
  private async getIdentityToken(targetAudience: string): Promise<string> {
    try {
      const { GoogleAuth } = await import('google-auth-library');
      const auth = new GoogleAuth();
      const client = await auth.getIdTokenClient(targetAudience);
      const headers = await client.getRequestHeaders();
      const token = headers['Authorization']?.replace('Bearer ', '');
      if (token) {
        this.logger.debug('Identity token generated successfully');
        return token;
      }
      throw new Error('No token in headers');
    } catch (error) {
      this.logger.warn(
        `Could not generate identity token (expected in local dev): ${error}`,
      );
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
    try {
      const res = await fetch(sessionUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferred_language: 'Spanish' }),
      });
      this.logger.debug(
        `ADK session init: ${res.status} for user=${userId} session=${sessionId}`,
      );
    } catch (error) {
      this.logger.warn(`ADK session init failed (non-blocking): ${error}`);
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

    let finalAnswerData: Record<string, unknown> = {};
    const intermediateActions: string[] = [];

    for (const jsonStr of lines) {
      try {
        const block = JSON.parse(jsonStr);
        const parts = block?.content?.parts ?? [];

        for (const part of parts) {
          // Intermediate step: agent calling a tool/sub-agent
          if (part.functionCall) {
            const toolName = part.functionCall.name ?? 'unknown';
            intermediateActions.push(`Ejecutando: ${toolName}...`);
          }

          // Text response: parse inner JSON from the agent
          if (part.text) {
            const textContent: string = part.text;
            try {
              if (textContent.includes('{')) {
                const parsed = JSON.parse(textContent);
                // The last text block with parsed JSON is the final answer
                finalAnswerData = parsed;
              }
            } catch {
              // Not JSON, use as plain text fallback
              if (!finalAnswerData['answer']) {
                finalAnswerData['answer'] = textContent;
              }
            }
          }
        }
      } catch {
        // Skip malformed JSON blocks
        continue;
      }
    }

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

    try {
      // 1. Get identity token for Cloud Run authentication
      const token = await this.getIdentityToken(this.adkUrl);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      // Only add Authorization header if we have a real token
      if (token !== 'LOCAL_DEVELOPMENT_TOKEN') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // 2. Initialize ADK session
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

      this.logger.debug(`Sending to ADK: ${runUrl}`);

      const res = await fetch(runUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        this.logger.error(
          `ADK API responded with status ${res.status}: ${res.statusText}`,
        );
        return {
          response:
            'Lo siento, no pude procesar tu consulta. Por favor, intentá de nuevo más tarde.',
        };
      }

      // 4. Parse SSE response
      const responseText = await res.text();
      this.logger.debug('ADK SSE response received');

      const structured = this.parseAdkSseResponse(responseText);

      return {
        response: structured.answer,
        structured,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error('ADK API request timed out after 300s');
        return {
          response:
            'Lo siento, la consulta tardó demasiado. Por favor, intentá de nuevo más tarde.',
        };
      }
      this.logger.error(`Error calling ADK API: ${error}`);
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
