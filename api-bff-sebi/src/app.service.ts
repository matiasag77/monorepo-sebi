import { Injectable } from '@nestjs/common';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

@Injectable()
export class AppService {
  getStatus() {
    return {
      service: 'api-bff-sebi',
      status: 'ok',
      mode: 'mock-ai-responses',
    };
  }

  getConversationHistory() {
    return [
      {
        id: 'sales-q4',
        title: 'Análisis de ventas Q4',
        updatedAt: '2026-03-01T18:20:00.000Z',
      },
      {
        id: 'churn',
        title: 'Reporte churn mensual',
        updatedAt: '2026-02-28T11:45:00.000Z',
      },
      {
        id: 'forecast-2026',
        title: 'Forecast revenue 2026',
        updatedAt: '2026-02-27T09:10:00.000Z',
      },
    ];
  }

  getMessagesByConversation(conversationId: string): ChatMessage[] {
    const byConversation: Record<string, ChatMessage[]> = {
      'sales-q4': [
        {
          id: 'm-1',
          role: 'user',
          content: '¿Cómo cerró Q4 vs Q3?',
          createdAt: '2026-03-01T18:15:00.000Z',
        },
        {
          id: 'm-2',
          role: 'assistant',
          content:
            'Q4 cerró con +12.3% vs Q3. Norte lideró el crecimiento y Enterprise fue el principal driver.',
          createdAt: '2026-03-01T18:16:00.000Z',
        },
      ],
      churn: [
        {
          id: 'm-3',
          role: 'user',
          content: 'Resumen de churn de febrero.',
          createdAt: '2026-02-28T11:40:00.000Z',
        },
        {
          id: 'm-4',
          role: 'assistant',
          content:
            'El churn bajó a 3.2%. El segmento SMB mostró la mayor mejora tras la campaña de retención.',
          createdAt: '2026-02-28T11:42:00.000Z',
        },
      ],
    };

    return byConversation[conversationId] ?? [];
  }

  buildMockAiReply(prompt: string) {
    const promptLower = prompt.toLowerCase();

    if (promptLower.includes('ventas') || promptLower.includes('q4')) {
      return {
        source: 'mock',
        answer:
          'Respuesta en duro: Q4 mejoró +12.3% vs Q3. Próximo paso: conectar este endpoint con el proveedor de IA real (API, SQS o Pub/Sub).',
      };
    }

    if (promptLower.includes('churn')) {
      return {
        source: 'mock',
        answer:
          'Respuesta en duro: churn actual 3.2%, con mejora de 0.6pp respecto al mes anterior. Esta respuesta se reemplazará por integración futura.',
      };
    }

    return {
      source: 'mock',
      answer:
        'Respuesta en duro: estamos en modo mock. Más adelante integraremos un proveedor real de IA vía API, SQS o Google Pub/Sub.',
    };
  }
}
