FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --index-url https://download.pytorch.org/whl/cpu "torch==2.14.0+cpu"

RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY alembic.ini ./
COPY migrations ./migrations
COPY backend ./backend
COPY models ./models

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"]
