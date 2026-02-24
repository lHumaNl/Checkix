.PHONY: help install migrate test lint format run clean docker-up docker-down docker-build docker-logs shell createsuperuser collectstatic requirements

SHELL := /bin/bash
PYTHON := python
MANAGE := $(PYTHON) scripts/manage.py
PIP := pip
PYTEST := pytest

help:
	@echo "Checkix - Available commands:"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make install          Install dependencies"
	@echo "  make requirements      Generate requirements.txt from pyproject"
	@echo ""
	@echo "Database:"
	@echo "  make migrate          Run database migrations"
	@echo "  make migrations        Create new migrations"
	@echo "  make reset-db         Reset database (WARNING: destroys data)"
	@echo ""
	@echo "Development:"
	@echo "  make run              Start development server"
	@echo "  make shell            Open Django shell"
	@echo "  make createsuperuser  Create admin user"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  make test             Run all tests"
	@echo "  make test-cov         Run tests with coverage report"
	@echo "  make lint             Run linting (flake8, mypy)"
	@echo "  make format           Format code (black, isort)"
	@echo "  make check            Run all checks (lint, test)"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up        Start Docker containers"
	@echo "  make docker-down      Stop Docker containers"
	@echo "  make docker-build     Build Docker images"
	@echo "  make docker-logs      View Docker logs"
	@echo ""
	@echo "Production:"
	@echo "  make collectstatic    Collect static files"
	@echo "  make clean            Remove generated files"

install:
	$(PIP) install -r requirements/development.txt

install-prod:
	$(PIP) install -r requirements/production.txt

migrate:
	$(MANAGE) migrate

migrations:
	$(MANAGE) makemigrations

reset-db:
	@echo "WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	$(MANAGE) reset_db --noinput
	$(MAKE) migrate

run:
	$(MANAGE) runserver

run-plus:
	$(MANAGE) runserver_plus

shell:
	$(MANAGE) shell

shell-plus:
	$(MANAGE) shell_plus

createsuperuser:
	$(MANAGE) createsuperuser

collectstatic:
	$(MANAGE) collectstatic --noinput

test:
	$(PYTEST) -v

test-cov:
	$(PYTEST) --cov=apps --cov-report=html --cov-report=term

test-parallel:
	$(PYTEST) -v -n auto

lint:
	flake8 apps config scripts
	mypy apps config --ignore-missing-imports

format:
	black apps config scripts
	isort apps config scripts

format-check:
	black --check apps config scripts
	isort --check-only apps config scripts

check: lint test

clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	rm -rf .pytest_cache
	rm -rf .mypy_cache
	rm -rf .coverage htmlcov
	rm -rf staticfiles

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-build:
	docker-compose build

docker-logs:
	docker-compose logs -f

docker-restart:
	docker-compose restart

docker-ps:
	docker-compose ps

docker-clean:
	docker-compose down -v --remove-orphans

celery-worker:
	celery -A config worker -l info

celery-beat:
	celery -A config beat -l info

celery-flower:
	celery -A config flower

db-shell:
	$(MANAGE) dbshell

dumpdata:
	$(MANAGE) dumpdata --indent 2 > fixtures/dump.json

loaddata:
	$(MANAGE) loaddata fixtures/dump.json

clear-cache:
	$(MANAGE) clear_cache

show-urls:
	$(MANAGE) show_urls

show-migrations:
	$(MANAGE) showmigrations

requirements:
	pip-compile requirements/base.in -o requirements/base.txt
	pip-compile requirements/development.in -o requirements/development.txt
	pip-compile requirements/production.in -o requirements/production.txt

dev-setup: install
	cp -n .env.example .env 2>/dev/null || true
	$(MAKE) migrate
	@echo ""
	@echo "Development setup complete!"
	@echo "1. Edit .env with your settings"
	@echo "2. Run 'make createsuperuser' to create an admin"
	@echo "3. Run 'make run' to start the server"
