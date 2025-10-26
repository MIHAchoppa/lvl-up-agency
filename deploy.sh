#!/bin/bash

# Quick Deploy Script for Level Up Agency
# This script helps quickly deploy the application using Docker Compose

set -e  # Exit on error

echo "======================================"
echo "Level Up Agency - Quick Deploy"
echo "======================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed"
    echo "Please install Docker Compose from https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker is installed"
echo "✅ Docker Compose is installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found"
    echo "Creating .env from .env.example..."
    
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file from .env.example"
        echo "⚠️  IMPORTANT: Please edit .env and update the configuration values"
        echo ""
        read -p "Press Enter to continue or Ctrl+C to exit and edit .env first..."
    else
        echo "❌ Error: .env.example not found"
        exit 1
    fi
else
    echo "✅ .env file found"
fi

echo ""
echo "======================================"
echo "Starting deployment..."
echo "======================================"
echo ""

# Stop any existing containers
echo "🛑 Stopping existing containers (if any)..."
docker-compose down 2>/dev/null || true

# Pull latest images (optional, comment out if building locally)
echo ""
echo "📦 Building Docker images..."
docker-compose build

# Start the services
echo ""
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo ""
echo "🏥 Checking service health..."

# Check MongoDB
if docker-compose ps | grep -q "mongodb.*Up"; then
    echo "✅ MongoDB is running"
else
    echo "⚠️  MongoDB may not be running properly"
fi

# Check Backend
if docker-compose ps | grep -q "backend.*Up"; then
    echo "✅ Backend is running"
else
    echo "⚠️  Backend may not be running properly"
fi

# Check Frontend
if docker-compose ps | grep -q "frontend.*Up"; then
    echo "✅ Frontend is running"
else
    echo "⚠️  Frontend may not be running properly"
fi

echo ""
echo "======================================"
echo "🎉 Deployment Complete!"
echo "======================================"
echo ""
echo "Access your application at:"
echo "  🌐 Frontend:  http://localhost"
echo "  🔌 Backend:   http://localhost:8000"
echo "  📊 API Docs:  http://localhost:8000/docs"
echo ""
echo "Useful commands:"
echo "  📋 View logs:       docker-compose logs -f"
echo "  🔄 Restart:         docker-compose restart"
echo "  🛑 Stop:            docker-compose down"
echo "  🔍 Check status:    docker-compose ps"
echo ""
echo "For more information, see DEPLOY.md"
echo ""
