# main.py
import os
import logging
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from google_adk import Agent, App, Tool, run_server

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------- Esquema de respuesta estructurado ----------
class SebiResponse(BaseModel):
    answer: str = Field(description="Respuesta narrativa o análisis final del agente")
    context: Optional[str] = Field(default=None, description="Supuestos o aclaraciones sobre los datos extraídos")
    table: Optional[List[Dict[str, str]]] = Field(default=None, description="Datos estructurados para renderizar como tabla")
    proactivo: Optional[str] = Field(default=None, description="Sugerencia de próxima acción de negocio")


# ---------- Herramientas del agente ----------
def consultar_ventas_q3(trimestre: str) -> str:
    """Útil para obtener los datos de ventas de un trimestre específico."""
    return """
    Ventas Q3: $12.4M. Objetivo: $11.7M.
    Julio: 4.1M (Obj: 3.8M). Agosto: 4.3M (Obj: 4.0M). Septiembre: 4.0M (Obj: 3.9M).
    Solo ventas confirmadas.
    """

sales_tool = Tool(
    name="call_analytics_agent",
    description="Consulta datos de ventas por trimestre",
    func=consultar_ventas_q3
)


# ---------- Configuración del agente ----------
sebi_data_agent = Agent(
    name="orquestador",
    instructions="""
    Eres SEBI, un asistente de datos experto para FORUS.
    Tu objetivo es analizar datos de ventas y entregarlos en el formato JSON estructurado requerido.
    Usa la herramienta 'call_analytics_agent' para obtener la data real antes de responder.
    Siempre responde en español.
    """,
    tools=[sales_tool],
    model=os.environ.get("ADK_MODEL", "gemini-2.5-flash"),
    output_schema=SebiResponse
)


# ---------- App ADK ----------
app = App(
    name="data_agent_app",
    agents=[sebi_data_agent]
)


# ---------- Modo PubSub ----------
def run_pubsub_mode():
    """Ejecuta el agente en modo Pub/Sub, escuchando mensajes de un topic."""
    from google.cloud import pubsub_v1
    import json

    project_id = os.environ["GOOGLE_CLOUD_PROJECT"]
    subscription_id = os.environ["PUBSUB_SUBSCRIPTION_ID"]
    response_topic_id = os.environ.get("PUBSUB_RESPONSE_TOPIC_ID")

    subscriber = pubsub_v1.SubscriberClient()
    subscription_path = subscriber.subscription_path(project_id, subscription_id)

    publisher = None
    response_topic_path = None
    if response_topic_id:
        publisher = pubsub_v1.PublisherClient()
        response_topic_path = publisher.topic_path(project_id, response_topic_id)

    logger.info(f"Escuchando mensajes en {subscription_path}...")

    def callback(message):
        try:
            data = json.loads(message.data.decode("utf-8"))
            prompt = data.get("prompt", "")
            logger.info(f"Mensaje recibido: {prompt[:100]}...")

            # Procesar con el agente ADK
            response = sebi_data_agent.run(prompt)

            # Publicar respuesta si hay topic de respuesta configurado
            if publisher and response_topic_path:
                response_data = json.dumps({
                    "request_id": data.get("request_id"),
                    "response": response.model_dump() if hasattr(response, "model_dump") else str(response),
                }).encode("utf-8")
                publisher.publish(response_topic_path, response_data)
                logger.info("Respuesta publicada en topic de respuesta")

            message.ack()
            logger.info("Mensaje procesado y confirmado")
        except Exception as e:
            logger.error(f"Error procesando mensaje: {e}")
            message.nack()

    streaming_pull = subscriber.subscribe(subscription_path, callback=callback)
    logger.info(f"Modo Pub/Sub activo. Proyecto: {project_id}")

    try:
        streaming_pull.result()
    except KeyboardInterrupt:
        streaming_pull.cancel()
        streaming_pull.result()
        logger.info("Pub/Sub listener detenido")


# ---------- Entrypoint ----------
if __name__ == "__main__":
    mode = os.environ.get("ADK_MODE", "simple").lower()

    if mode == "pubsub":
        logger.info("Iniciando en modo Pub/Sub...")
        run_pubsub_mode()
    else:
        logger.info("Iniciando en modo simple (HTTP/SSE)...")
        run_server(app, host="0.0.0.0", port=8000)
