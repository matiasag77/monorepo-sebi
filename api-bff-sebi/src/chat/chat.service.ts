import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly aiApiUrl =
    'https://skelligen-api.prod.interno.forus-sistemas.com/api/test-ai';

  async sendMessage(message: string): Promise<{ response: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(this.aiApiUrl, {
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
          `AI API responded with status ${res.status}: ${res.statusText}`,
        );
        return {
          response:
            'Lo siento, no pude procesar tu consulta en este momento. Por favor, intentá de nuevo más tarde.',
        };
      }

      const data = await res.json();
      this.logger.debug('AI API response received');
      const rawResponse = data?.data?.response ?? data.response ?? data.message ?? JSON.stringify(data);
      const response = this.sanitizeResponse(rawResponse);
      return { response };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error('AI API request timed out after 30s');
        return {
          response:
            'Lo siento, la consulta tardó demasiado. Por favor, intentá de nuevo más tarde.',
        };
      }
      this.logger.error(`Error calling AI API: ${error}`);
      return {
        response:
          'Lo siento, ocurrió un error al conectar con el servicio de IA. Por favor, intentá de nuevo más tarde.',
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
