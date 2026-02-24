#!/bin/bash
set -e

echo "Starting Checkix application..."

: "${DJANGO_ENV:=development}"
: "${DJANGO_SETTINGS_MODULE:=config.settings.${DJANGO_ENV}}"

export DJANGO_SETTINGS_MODULE

wait_for_service() {
    local host="$1"
    local port="$2"
    local service="$3"
    local max_attempts="${4:-30}"
    local attempt=1
    
    echo "Waiting for ${service} at ${host}:${port}..."
    
    while ! nc -z "${host}" "${port}" 2>/dev/null; do
        if [ "${attempt}" -ge "${max_attempts}" ]; then
            echo "Error: ${service} not available after ${max_attempts} attempts"
            exit 1
        fi
        echo "Attempt ${attempt}/${max_attempts}: ${service} not ready, waiting..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "${service} is available!"
}

if [ -n "${DB_HOST}" ] && [ -n "${DB_PORT}" ]; then
    wait_for_service "${DB_HOST}" "${DB_PORT}" "Database" 30
fi

if [ -n "${REDIS_HOST}" ] && [ -n "${REDIS_PORT:-6379}" ]; then
    wait_for_service "${REDIS_HOST}" "${REDIS_PORT:-6379}" "Redis" 30
fi

echo "Running database migrations..."
python scripts/manage.py migrate --noinput

echo "Collecting static files..."
python scripts/manage.py collectstatic --noinput

if [ -n "${DJANGO_SUPERUSER_USERNAME}" ] && [ -n "${DJANGO_SUPERUSER_EMAIL}" ]; then
    echo "Creating superuser if not exists..."
    python scripts/manage.py shell -c "
import os
from django.contrib.auth import get_user_model
User = get_user_model()
username = os.environ.get('DJANGO_SUPERUSER_USERNAME')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
if username and not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username, email, password)
    print(f'Created superuser: {username}')
"
fi

case "$1" in
    web)
        echo "Starting Gunicorn web server..."
        exec gunicorn config.wsgi:application \
            --bind "${BIND_ADDRESS:-0.0.0.0}:${PORT:-8000}" \
            --workers "${GUNICORN_WORKERS:-4}" \
            --threads "${GUNICORN_THREADS:-2}" \
            --timeout "${GUNICORN_TIMEOUT:-120}" \
            --access-logfile - \
            --error-logfile - \
            --log-level info
        ;;
    
    worker)
        echo "Starting Celery worker..."
        exec celery -A config worker \
            --loglevel="${CELERY_LOG_LEVEL:-info}" \
            --concurrency="${CELERY_CONCURRENCY:-4}" \
            --max-tasks-per-child="${CELERY_MAX_TASKS:-1000}"
        ;;
    
    beat)
        echo "Starting Celery beat scheduler..."
        exec celery -A config beat \
            --loglevel="${CELERY_LOG_LEVEL:-info}" \
            --schedule=/tmp/celerybeat-schedule
        ;;
    
    flower)
        echo "Starting Celery Flower monitoring..."
        exec celery -A config flower \
            --port="${FLOWER_PORT:-5555}" \
            --url-prefix="${FLOWER_URL_PREFIX:-flower}"
        ;;
    
    dev)
        echo "Starting development server..."
        exec python scripts/manage.py runserver "${BIND_ADDRESS:-0.0.0.0}:${PORT:-8000}"
        ;;
    
    shell)
        echo "Starting Django shell..."
        exec python scripts/manage.py shell
        ;;
    
    manage)
        shift
        echo "Running manage.py command: $*"
        exec python scripts/manage.py "$@"
        ;;
    
    *)
        echo "Unknown command: $1"
        echo "Available commands: web, worker, beat, flower, dev, shell, manage"
        exit 1
        ;;
esac
