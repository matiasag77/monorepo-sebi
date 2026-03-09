import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatService {
  private readonly keywordResponses: { keywords: string[]; response: string }[] = [
    {
      keywords: ['ventas', 'sales', 'venta'],
      response:
        'Las ventas del último trimestre muestran un crecimiento del 15% respecto al trimestre anterior. El segmento B2B lideró con un incremento del 22%, mientras que B2C creció un 8%. Los productos premium representaron el 35% del revenue total. Te recomiendo revisar el dashboard de ventas para más detalles.',
    },
    {
      keywords: ['kpi', 'indicador', 'indicadores', 'métrica', 'metricas'],
      response:
        'Los KPIs principales del equipo comercial están en verde: Tasa de conversión: 12.5% (meta: 10%), Ticket promedio: $2,450 (meta: $2,000), NPS: 72 (meta: 65), Churn rate: 3.2% (meta: 5%). El único indicador en amarillo es el tiempo de respuesta al cliente, que está en 4.2 horas vs la meta de 3 horas.',
    },
    {
      keywords: ['anomalía', 'anomalia', 'problema', 'error', 'alerta'],
      response:
        'He detectado 3 anomalías en los datos recientes: 1) Un pico inusual de cancelaciones el día 15 del mes (32% más que el promedio). 2) Una caída del 18% en el tráfico orgánico la última semana. 3) Un incremento del 45% en tickets de soporte relacionados con facturación. Te sugiero investigar estos puntos con los equipos correspondientes.',
    },
    {
      keywords: ['churn', 'cancelación', 'cancelacion', 'retención', 'retencion'],
      response:
        'El reporte de churn mensual indica una tasa del 3.2%, dentro del objetivo. Sin embargo, el segmento de PYMES muestra un churn del 5.8%, significativamente mayor al promedio. Las principales razones de cancelación son: precio (35%), falta de funcionalidades (28%), y migración a competidores (20%). El equipo de retención ha implementado 3 campañas de win-back con una tasa de recuperación del 12%.',
    },
    {
      keywords: ['forecast', 'pronóstico', 'pronostico', 'predicción', 'prediccion', 'proyección'],
      response:
        'El forecast de revenue para el próximo trimestre es de $4.2M, un 18% más que el trimestre actual. Esta proyección se basa en: pipeline actual ($6.8M con probabilidad ponderada), tendencia histórica de cierre (62%), y estacionalidad. El escenario optimista apunta a $4.8M y el conservador a $3.6M. La confianza del modelo es del 78%.',
    },
    {
      keywords: ['pipeline', 'datos', 'etl', 'integración', 'integracion'],
      response:
        'El pipeline de datos está operativo con un uptime del 99.2% este mes. Se procesan en promedio 2.3M de registros diarios. La última ejecución del ETL completó en 45 minutos (vs 52 min promedio). Hay 2 fuentes de datos con latencia elevada: el CRM (retraso de 2 horas) y el sistema de facturación (retraso de 30 min). Se recomienda revisar las conexiones con estos sistemas.',
    },
    {
      keywords: ['reporte', 'informe', 'report', 'dashboard'],
      response:
        'Puedo ayudarte a generar diferentes tipos de reportes. Los reportes disponibles incluyen: Reporte ejecutivo mensual, Dashboard de ventas en tiempo real, Análisis de cohortes, Reporte de funnel de conversión, y Análisis de rentabilidad por producto. ¿Cuál te gustaría generar? También puedo programar envíos automáticos a tu correo.',
    },
    {
      keywords: ['equipo', 'team', 'rendimiento', 'performance', 'productividad'],
      response:
        'El rendimiento del equipo comercial este mes: 8 de 12 representantes han alcanzado su cuota (67%). Top performers: María García (128% de cuota), Carlos López (115%), Ana Martínez (112%). El equipo tiene 45 deals activos en pipeline con un valor total de $3.2M. La velocidad promedio de cierre es de 28 días, 3 días menos que el mes anterior.',
    },
    {
      keywords: ['cliente', 'clientes', 'customer', 'cuenta'],
      response:
        'Resumen de la base de clientes: Total activos: 1,247. Nuevos este mes: 38. En riesgo de churn: 23 (identificados por el modelo predictivo). Top 10 clientes representan el 28% del revenue. El segmento enterprise creció un 12% en el último trimestre. La satisfacción general (CSAT) es de 4.2/5.',
    },
    {
      keywords: ['ayuda', 'help', 'qué puedes', 'que puedes', 'funciones'],
      response:
        'Soy tu asistente de Business Intelligence. Puedo ayudarte con: 📊 Análisis de ventas y revenue, 📈 KPIs y métricas del negocio, 🔍 Detección de anomalías en datos, 📋 Generación de reportes, 💰 Forecasting y proyecciones, 👥 Rendimiento de equipos, 🔄 Estado del pipeline de datos. Simplemente pregúntame sobre cualquiera de estos temas.',
    },
  ];

  private readonly defaultResponse =
    'Gracias por tu consulta. He procesado tu mensaje y estoy analizando la información disponible. Para darte una respuesta más precisa, ¿podrías especificar si necesitas información sobre ventas, KPIs, forecasting, pipeline de datos, o algún otro tema específico? Estoy aquí para ayudarte con cualquier análisis de datos que necesites.';

  sendMessage(message: string): { response: string } {
    const lowerMessage = message.toLowerCase();
    for (const entry of this.keywordResponses) {
      if (entry.keywords.some((keyword) => lowerMessage.includes(keyword))) {
        return { response: entry.response };
      }
    }
    return { response: this.defaultResponse };
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
