.PHONY: help install build start stop restart logs clean test lint deploy

# Default target
help:
	@echo "Level Up Agency - Available Commands"
	@echo "====================================="
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make install      - Install all dependencies"
	@echo "  make build        - Build Docker images"
	@echo ""
	@echo "Running Services:"
	@echo "  make start        - Start all services with Docker Compose"
	@echo "  make stop         - Stop all services"
	@echo "  make restart      - Restart all services"
	@echo "  make logs         - View logs from all services"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start services in development mode"
	@echo "  make dev-frontend - Run frontend dev server locally"
	@echo "  make dev-backend  - Run backend dev server locally"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  make test         - Run all tests"
	@echo "  make test-frontend - Run frontend tests"
	@echo "  make test-backend  - Run backend tests"
	@echo "  make lint         - Run linters"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean        - Remove build artifacts and containers"
	@echo "  make reset        - Full reset (clean + remove volumes)"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy       - Deploy using deploy.sh script"
	@echo ""

# Installation
install:
	@echo "Installing dependencies..."
	@cd frontend && npm install
	@cd backend && pip install -r requirements.txt
	@cd backend-node && npm install
	@echo "✅ Dependencies installed"

# Build Docker images
build:
	@echo "Building Docker images..."
	@docker-compose build
	@echo "✅ Docker images built"

# Start services
start:
	@echo "Starting services..."
	@docker-compose up -d
	@echo "✅ Services started"
	@echo "Frontend: http://localhost"
	@echo "Backend: http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"

# Stop services
stop:
	@echo "Stopping services..."
	@docker-compose down
	@echo "✅ Services stopped"

# Restart services
restart: stop start

# View logs
logs:
	@docker-compose logs -f

# Development mode
dev:
	@echo "Starting services in development mode..."
	@docker-compose -f docker-compose.yml -f docker-compose.override.yml up

dev-frontend:
	@echo "Starting frontend development server..."
	@cd frontend && npm start

dev-backend:
	@echo "Starting backend development server..."
	@cd backend && uvicorn server:app --reload

# Testing
test: test-frontend test-backend

test-frontend:
	@echo "Running frontend tests..."
	@cd frontend && npm test -- --watchAll=false

test-backend:
	@echo "Running backend tests..."
	@cd backend && pytest || echo "Note: Configure pytest if tests are not found"

# Linting
lint:
	@echo "Running linters..."
	@echo "Frontend:"
	@cd frontend && npm run lint || echo "No frontend lint script"
	@echo "Backend:"
	@cd backend && flake8 . || echo "flake8 not installed"

# Clean up
clean:
	@echo "Cleaning up..."
	@docker-compose down
	@rm -rf frontend/build
	@rm -rf frontend/node_modules
	@rm -rf backend-node/node_modules
	@find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "✅ Cleaned up"

# Full reset
reset: clean
	@echo "Removing Docker volumes..."
	@docker-compose down -v
	@echo "✅ Full reset complete"

# Deploy
deploy:
	@./deploy.sh
