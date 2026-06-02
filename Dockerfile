FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends postgresql-client build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
COPY src/ src/
RUN pip install --no-cache-dir .
COPY alembic/ alembic/
COPY alembic.ini .

RUN mkdir -p /app/staticfiles /app/mediafiles

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "checkix.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
