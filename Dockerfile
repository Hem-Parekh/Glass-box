# Aegis Ascend backend: the website and API, served by uvicorn.
FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend backend
COPY server server
COPY site site
COPY fundmix/web fundmix/web
RUN useradd --create-home app && mkdir -p /data/uploads && chown app /data/uploads
USER app
ENV GB_UPLOADS=/data/uploads
EXPOSE 8000
HEALTHCHECK CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz')"
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
