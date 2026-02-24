#!/usr/bin/env python
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'checkix.settings')

django.setup()

from django.core.management import call_command
from django.db import connection
from django.contrib.auth import get_user_model

User = get_user_model()


def check_db_connection():
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        print('Database connection successful')
        return True
    except Exception as e:
        print(f'Database connection failed: {e}')
        return False


def run_migrations():
    print('Running migrations...')
    call_command('migrate', '--noinput')
    print('Migrations completed')


def collect_static():
    print('Collecting static files...')
    call_command('collectstatic', '--noinput')
    print('Static files collected')


def create_superuser():
    username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
    email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@checkix.com')
    password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')

    if not password:
        print('DJANGO_SUPERUSER_PASSWORD not set, skipping superuser creation')
        return

    if User.objects.filter(username=username).exists():
        print(f'Superuser "{username}" already exists')
        return

    try:
        User.objects.create_superuser(
            username=username,
            email=email,
            password=password
        )
        print(f'Superuser "{username}" created successfully')
    except Exception as e:
        print(f'Failed to create superuser: {e}')


def main():
    print('Initializing database...')

    if not check_db_connection():
        print('Failed to connect to database. Exiting.')
        sys.exit(1)

    run_migrations()
    collect_static()
    create_superuser()

    print('Database initialization completed')


if __name__ == '__main__':
    main()
