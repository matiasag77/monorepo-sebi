FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# ADK_MODE can be "simple" or "pubsub"
ENV ADK_MODE=simple

CMD ["python", "main.py"]
