import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AiProvider = 'skelligen' | 'adk';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  private readonly skellegenUrl: string;
  private readonly adkUrl: string;
  private readonly defaultProvider: AiProvider;

  constructor(private readonly configService: ConfigService) {
    this.skellegenUrl = this.configService.get<string>(
      'SKELLIGEN_API_URL',
      'https://skelligen-api.prod.interno.forus-sistemas.com/api/test-ai',
    );
    this.adkUrl = this.configService.get<string>(
      'ADK_API_URL',
      'http://service-adk:8000',
    );
    this.defaultProvider = this.configService.get<AiProvider>(
      'AI_PROVIDER',
      'skelligen',
    );
  }

  async sendMessage(
    message: string,
    provider?: AiProvider,
  ): Promise<{ response: string; provider: AiProvider }> {
    const activeProvider = provider ?? this.defaultProvider;

    if (activeProvider === 'adk') {
      return this.sendToAdk(message);
    }
    return this.sendToSkelligen(message);
  }

  private async sendToSkelligen(
    message: string,
  ): Promise<{ response: string; provider: AiProvider }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(this.skellegenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ prompt: message }),
        signal: controller.signal,
      });

      if (!res.ok) {
        this.logger.error(
          `Skelligen API responded with status ${res.status}: ${res.statusText}`,
        );
        return {
          response:
            'Lo siento, no pude procesar tu consulta en este momento. Por favor, intentá de nuevo más tarde.',
          provider: 'skelligen',
        };
      }

      const data = await res.json();
      this.logger.debug('Skelligen API response received');
      const rawResponse =
        data?.data?.response ?? data.response ?? data.message ?? JSON.stringify(data);
      const response = this.sanitizeResponse(rawResponse);
      return { response, provider: 'skelligen' };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error('Skelligen API request timed out after 30s');
        return {
          response:
            'Lo siento, la consulta tardó demasiado. Por favor, intentá de nuevo más tarde.',
          provider: 'skelligen',
        };
      }
      this.logger.error(`Error calling Skelligen API: ${error}`);
      return {
        response:
          'Lo siento, ocurrió un error al conectar con el servicio de IA. Por favor, intentá de nuevo más tarde.',
        provider: 'skelligen',
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async sendToAdk(
    message: string,
  ): Promise<{ response: string; provider: AiProvider }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`${this.adkUrl}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          app_name: 'data_agent_app',
          user_id: 'sebi-user',
          session_id: `session-${Date.now()}`,
          new_message: {
            role: 'user',
            parts: [{ text: message }],
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        this.logger.error(
          `ADK API responded with status ${res.status}: ${res.statusText}`,
        );
        return {
          response:
            'Lo siento, no pude procesar tu consulta con ADK. Por favor, intentá de nuevo más tarde.',
          provider: 'adk',
        };
      }

      const data = await res.json();
      this.logger.debug('ADK API response received');

      // ADK devuelve la respuesta del agente en formato estructurado
      const rawResponse =
        data?.answer ?? data?.response ?? data?.text ?? JSON.stringify(data);
      const response = this.sanitizeResponse(rawResponse);
      return { response, provider: 'adk' };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error('ADK API request timed out after 30s');
        return {
          response:
            'Lo siento, la consulta al agente ADK tardó demasiado. Por favor, intentá de nuevo más tarde.',
          provider: 'adk',
        };
      }
      this.logger.error(`Error calling ADK API: ${error}`);
      return {
        response:
          'Lo siento, ocurrió un error al conectar con el servicio ADK. Por favor, intentá de nuevo más tarde.',
        provider: 'adk',
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private sanitizeResponse(text: string): string {
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^>]*>/gi, '');
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
