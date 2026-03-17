# main.py
import os
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
# (Nota: Importaciones especulativas basadas en la estructura estándar de frameworks multi-agente de Google)
from google_adk import Agent, App, Tool, run_server

# 1. Definimos el esquema de respuesta estricto que espera nuestro frontend React
class SebiResponse(BaseModel):
    answer: str = Field(description="Respuesta narrativa o análisis final del agente")
    context: Optional[str] = Field(description="Supuestos o aclaraciones sobre los datos extraídos")
    table: Optional[List[Dict[str, str]]] = Field(description="Datos estructurados para renderizar como tabla")
    proactivo: Optional[str] = Field(description="Sugerencia de próxima acción de negocio")

# 2. Definimos una Herramienta (Tool) que el agente puede usar
# En la vida real, esto haría una query a BigQuery o una API interna.
def consultar_ventas_q3(trimestre: str) -> str:
    """Útil para obtener los datos de ventas de un trimestre específico."""
    # Data simulada para el ejemplo
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

# 3. Configuramos el Agente de IA
sebi_data_agent = Agent(
    name="SebiDataAnalyst",
    instructions="""
    Eres SEBI, un asistente de datos experto para FORUS. 
    Tu objetivo es analizar datos de ventas y entregarlos en el formato JSON estructurado requerido.
    Usa la herramienta 'call_analytics_agent' para obtener la data real antes de responder.
    """,
    tools=[sales_tool],
    model="gemini-1.5-pro", # El modelo de Google que razona y extrae JSON
    output_schema=SebiResponse # Forzamos la salida estructurada
)

# 4. Registramos la aplicación en el ADK
# Este nombre "data_agent_app" es exactamente el que configuraste en tu .env de Node (ADK_APP_NAME)
app = App(
    name="data_agent_app",
    agents=[sebi_data_agent]
)

# 5. Iniciamos el servidor del ADK (Expondrá los endpoints REST/SSE)
if __name__ == "__main__":
    # Arranca en el puerto 8000, escuchando en todas las interfaces para Docker
    run_server(app, host="0.0.0.0", port=8000)