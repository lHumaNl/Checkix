from .base import *
import os

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "*"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db_dev.sqlite3",
    }
}

INSTALLED_APPS += [
    "debug_toolbar",
]

MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")

INTERNAL_IPS = ["127.0.0.1"]

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "cache+memory://"

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}

LOGGING["loggers"]["checkix"]["level"] = "DEBUG"

# Disable throttling in development / E2E tests
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []

# Disable JWT token rotation so E2E tests can reuse the same refresh token
# across multiple test browser contexts (storageState is loaded fresh each time)
SIMPLE_JWT["ROTATE_REFRESH_TOKENS"] = False
SIMPLE_JWT["BLACKLIST_AFTER_ROTATION"] = False
