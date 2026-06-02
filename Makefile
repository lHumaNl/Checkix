.PHONY: help install install-prod migrate migrations test test-cov lint type-check format format-check run clean docker-up docker-down docker-build docker-logs check dev-setup

SHELL := /bin/bash
PYTHON := $(shell if [ -x venv/bin/python ]; then printf 'venv/bin/python'; else printf 'python3'; fi)
PIP := $(PYTHON) -m pip
PYTEST := $(PYTHON) -m pytest
RUFF := $(PYTHON) -m ruff
MYPY := $(PYTHON) -m mypy
APP := checkix.main:app
HOST ?= 0.0.0.0
PORT ?= 8000

help:
	@echo "Checkix - Available commands:"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make install          Install project with development dependencies"
	@echo "  make install-prod     Install production dependencies"
	@echo ""
	@echo "Database:"
	@echo "  make migrate          Apply Alembic migrations"
	@echo "  make migrations       Create an Alembic revision (MSG='message')"
	@echo ""
	@echo "Development:"
	@echo "  make run              Start FastAPI development server"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  make test             Run all tests"
	@echo "  make test-cov         Run tests with coverage report"
	@echo "  make lint             Run Ruff linting"
	@echo "  make type-check       Run mypy"
	@echo "  make format           Format code with Ruff"
	@echo "  make check            Run all checks (lint, test)"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up        Start Docker containers"
	@echo "  make docker-down      Stop Docker containers"
	@echo "  make docker-build     Build Docker images"
	@echo "  make docker-logs      View Docker logs"
	@echo "  make clean            Remove generated files"

install:
	$(PIP) install -e ".[dev]"

install-prod:
	$(PIP) install .

migrate:
	$(PYTHON) -m alembic upgrade head

migrations:
	@test -n "$(MSG)" || (echo "Usage: make migrations MSG='describe change'" && exit 1)
	$(PYTHON) -m alembic revision --autogenerate -m "$(MSG)"

run:
	$(PYTHON) -m uvicorn $(APP) --host $(HOST) --port $(PORT) --reload

test:
	$(PYTEST) -v

test-cov:
	$(PYTEST) --cov=checkix --cov-report=html --cov-report=term

lint:
	$(RUFF) check src tests

type-check:
	$(MYPY) src/checkix --ignore-missing-imports

format:
	$(RUFF) format src tests
	$(RUFF) check --fix src tests

format-check:
	$(RUFF) check src tests

check: lint test

clean:
	find src tests alembic -type f -name "*.pyc" -delete
	find src tests alembic -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -maxdepth 3 -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	rm -rf .pytest_cache
	rm -rf .mypy_cache
	rm -rf .coverage htmlcov

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

dev-setup: install
	cp -n .env.example .env 2>/dev/null || true
	$(MAKE) migrate
	@echo ""
	@echo "Development setup complete!"
	@echo "1. Edit .env with your settings"
	@echo "2. Run 'make run' to start the server"
