import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly aiApiUrl =
    'https://skelligen-api.prod.interno.forus-sistemas.com/api/test-ai';

  async sendMessage(message: string): Promise<{ response: string }> {
    try {
      const res = await fetch(this.aiApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ prompt: message }),
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
      return { response: data.response ?? data.message ?? JSON.stringify(data) };
    } catch (error) {
      this.logger.error(`Error calling AI API: ${error}`);
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
