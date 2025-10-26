# Deployment Guide

This guide covers deploying the Level Up Agency platform to various environments.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Development with Docker](#local-development-with-docker)
- [Production Deployment](#production-deployment)
- [GitHub Container Registry](#github-container-registry)
- [Cloud Deployment Options](#cloud-deployment-options)
- [Monitoring and Health Checks](#monitoring-and-health-checks)

## Prerequisites

### Required Software
- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)
- **Git**
- **Node.js** 18+ (for local development)
- **Python** 3.11+ (for local development)

### Accounts Needed
- GitHub account (for CI/CD)
- MongoDB instance or MongoDB Atlas account
- Optional: Cloud provider account (AWS, GCP, Azure, or DigitalOcean)

## Environment Variables

### Backend (FastAPI) Variables

Create a `.env` file in the root directory:

```bash
# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=lvl_up_agency

# JWT Authentication
JWT_SECRET=your-secret-key-here-change-in-production

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# AI Service Configuration (Optional)
AI_API_KEY=your-api-key-here
AI_BASE_URL=https://your-ai-service.com

# ElevenLabs Voice Service (Optional)
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_BASE_URL=https://api.elevenlabs.io/v1

# Email Service (Optional)
SENDGRID_API_KEY=your-sendgrid-key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password

# Server Configuration
PORT=8000
HOST=0.0.0.0
```

### Frontend Variables

Create a `.env` file in the `frontend/` directory:

```bash
# API Endpoint
REACT_APP_API_URL=http://localhost:8000

# Optional: Analytics
REACT_APP_ANALYTICS_ID=your-analytics-id
```

## Local Development with Docker

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MIHAchoppa/lvl-up-agency.git
   cd lvl-up-agency
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

4. **Access the application:**
   - Frontend: http://localhost (port 80)
   - Backend API: http://localhost:8000
   - Backend Node: http://localhost:3001
   - MongoDB: localhost:27017

5. **View logs:**
   ```bash
   docker-compose logs -f
   ```

6. **Stop all services:**
   ```bash
   docker-compose down
   ```

### Development Mode

For active development with hot-reload:

```bash
# Frontend
cd frontend
npm install
npm start

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --reload

# Backend Node
cd backend-node
npm install
npm run dev
```

## Production Deployment

### Building Production Images

1. **Build all images:**
   ```bash
   docker-compose -f docker-compose.yml build
   ```

2. **Build individual services:**
   ```bash
   # Frontend
   docker build -t lvl-up-frontend ./frontend
   
   # Backend
   docker build -t lvl-up-backend ./backend
   
   # Backend Node
   docker build -t lvl-up-backend-node ./backend-node
   ```

### Security Checklist

Before deploying to production:

- [ ] Change all default passwords and secrets
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Enable HTTPS/TLS encryption
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable MongoDB authentication
- [ ] Review CORS_ORIGINS settings
- [ ] Remove debug mode and development flags
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting
- [ ] Update all dependencies to latest stable versions

## GitHub Container Registry

The project uses GitHub Actions to automatically build and push Docker images to GitHub Container Registry (GHCR).

### Automatic Builds

Images are automatically built and pushed when:
- Pushing to `main` branch
- Creating a new tag (e.g., `v1.0.0`)

### Pulling Images

```bash
# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull images
docker pull ghcr.io/mihachoppa/lvl-up-agency/frontend:latest
docker pull ghcr.io/mihachoppa/lvl-up-agency/backend:latest
docker pull ghcr.io/mihachoppa/lvl-up-agency/backend-node:latest
```

### Using Pre-built Images

Update `docker-compose.yml` to use GHCR images:

```yaml
services:
  frontend:
    image: ghcr.io/mihachoppa/lvl-up-agency/frontend:latest
    # ... rest of config
  
  backend:
    image: ghcr.io/mihachoppa/lvl-up-agency/backend:latest
    # ... rest of config
```

## Cloud Deployment Options

### Option 1: DigitalOcean App Platform

1. **Prepare your repository**
2. **Connect to DigitalOcean:**
   - Go to Apps → Create App
   - Connect your GitHub repository
   - Configure services (frontend, backend, database)

3. **Configure environment variables** in the DigitalOcean dashboard

4. **Deploy** - DigitalOcean will handle the build and deployment

### Option 2: AWS ECS/Fargate

1. **Push images to AWS ECR:**
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URL
   docker tag lvl-up-frontend YOUR_ECR_URL/frontend:latest
   docker push YOUR_ECR_URL/frontend:latest
   ```

2. **Create ECS Task Definitions** for each service

3. **Set up Application Load Balancer**

4. **Configure ECS Services** to run your tasks

### Option 3: Google Cloud Run

```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/frontend ./frontend
gcloud builds submit --tag gcr.io/PROJECT_ID/backend ./backend

# Deploy to Cloud Run
gcloud run deploy frontend --image gcr.io/PROJECT_ID/frontend --platform managed
gcloud run deploy backend --image gcr.io/PROJECT_ID/backend --platform managed
```

### Option 4: Azure Container Instances

```bash
# Create resource group
az group create --name lvl-up-agency --location eastus

# Deploy containers
az container create --resource-group lvl-up-agency \
  --name frontend --image ghcr.io/mihachoppa/lvl-up-agency/frontend:latest \
  --dns-name-label lvl-up-frontend --ports 80
```

### Option 5: Self-Hosted VPS

1. **Set up a VPS** (Ubuntu 22.04 recommended)

2. **Install Docker and Docker Compose:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Clone and deploy:**
   ```bash
   git clone https://github.com/MIHAchoppa/lvl-up-agency.git
   cd lvl-up-agency
   cp .env.example .env
   # Edit .env with production values
   docker-compose up -d
   ```

4. **Set up reverse proxy (Nginx):**
   ```bash
   sudo apt install nginx
   # Configure Nginx to proxy to your containers
   ```

5. **Set up SSL with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

## Database Setup

### MongoDB Atlas (Recommended for Production)

1. **Create a cluster** at https://www.mongodb.com/cloud/atlas

2. **Configure network access:**
   - Add your application server IPs
   - Or use 0.0.0.0/0 with strong authentication

3. **Create database user** with appropriate permissions

4. **Get connection string** and update `MONGO_URL` in your `.env`

### Self-Hosted MongoDB

```bash
# Using Docker
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=strongpassword \
  mongo:7.0
```

## Monitoring and Health Checks

### Health Check Endpoints

- **Frontend:** `http://your-domain/health`
- **Backend:** `http://your-domain:8000/health`
- **Backend Node:** `http://your-domain:3001/health`

### Docker Health Checks

All containers include health checks. View status:

```bash
docker ps
# Look at the STATUS column for health status
```

### Monitoring Setup

1. **Logs:**
   ```bash
   docker-compose logs -f [service_name]
   ```

2. **Resource Usage:**
   ```bash
   docker stats
   ```

3. **Recommended Tools:**
   - **Prometheus + Grafana** for metrics
   - **ELK Stack** for log aggregation
   - **Uptime Robot** for uptime monitoring
   - **Sentry** for error tracking

## Continuous Deployment

The project includes GitHub Actions workflows that automatically:
- Run tests on pull requests
- Build Docker images on merge to main
- Push images to GitHub Container Registry

### Setting Up Auto-Deploy

1. **Add deployment secrets** to GitHub:
   - Go to Settings → Secrets and variables → Actions
   - Add production credentials (SSH keys, API tokens, etc.)

2. **Create deployment workflow:**
   ```yaml
   # .github/workflows/deploy-production.yml
   name: Deploy to Production
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - name: Deploy to server
           # Add your deployment steps
   ```

## Troubleshooting

### Common Issues

**Issue: Frontend can't connect to backend**
- Check CORS_ORIGINS in backend .env
- Verify REACT_APP_API_URL in frontend .env
- Ensure backend is running and accessible

**Issue: Database connection failed**
- Verify MongoDB is running: `docker ps | grep mongodb`
- Check MONGO_URL in .env
- Ensure network connectivity between services

**Issue: Port already in use**
- Change port mappings in docker-compose.yml
- Stop conflicting services: `sudo lsof -i :PORT`

**Issue: Permission denied**
- Ensure proper file permissions: `chmod -R 755 .`
- Run with appropriate user permissions

## Rollback Procedure

If you need to rollback:

```bash
# Using Docker tags
docker-compose down
docker-compose pull  # Gets latest
docker-compose up -d

# Or specify version
docker pull ghcr.io/mihachoppa/lvl-up-agency/frontend:v1.0.0
```

## Backup and Restore

### MongoDB Backup

```bash
# Backup
docker exec mongodb mongodump --out /backup
docker cp mongodb:/backup ./mongodb-backup-$(date +%Y%m%d)

# Restore
docker cp ./mongodb-backup mongodb:/backup
docker exec mongodb mongorestore /backup
```

## Support

For issues and questions:
- Create an issue on GitHub
- Check existing documentation in `/docs`
- Review logs: `docker-compose logs -f`

---

**Last Updated:** October 2025
