# Security Improvements Implementation Guide

This guide provides step-by-step instructions for implementing the critical security improvements identified in the production readiness analysis.

## 🔴 CRITICAL: Immediate Actions Required

### 1. Update Axios Dependency (5 minutes)

**What was changed**: Updated axios from 1.8.4 to 1.12.0 in both `package.json` and `frontend/package.json`

**Action required**:
```bash
# Update frontend dependencies
cd frontend
npm install

# Update root dependencies (if used)
cd ..
npm install

# Verify the update
npm list axios
```

**Verification**:
```bash
# Check for vulnerabilities
cd frontend
npm audit

# Should show reduced vulnerabilities
```

---

### 2. Configure JWT Secret (10 minutes)

**What was changed**: Backend now requires JWT_SECRET to be set explicitly and validates its length.

**Action required**:

1. **Generate a strong secret** (at least 32 characters):
```bash
# Option 1: Using Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Option 2: Using OpenSSL
openssl rand -base64 32

# Option 3: Using /dev/urandom
head -c 32 /dev/urandom | base64
```

2. **Add to your environment**:
```bash
# Development (.env)
JWT_SECRET=your-generated-secret-here-min-32-chars

# Production (.env.production)
JWT_SECRET=different-strong-secret-for-production-min-32-chars
```

3. **Set ENVIRONMENT variable**:
```bash
# Development
ENVIRONMENT=development

# Production
ENVIRONMENT=production
```

**Verification**:
```bash
# Start backend - it should start without warnings
cd backend
python -m uvicorn server:app --reload

# Check logs - should not see JWT_SECRET warnings
```

---

### 3. Configure CORS Origins (5 minutes)

**What was changed**: CORS now requires explicit configuration and no longer allows '*' by default.

**Action required**:

1. **Add CORS_ORIGINS to environment**:
```bash
# Development (.env)
CORS_ORIGINS=http://localhost:3000,http://localhost:80

# Production (.env.production)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

2. **For multiple domains**, separate with commas (no spaces):
```bash
CORS_ORIGINS=https://app.example.com,https://api.example.com,https://admin.example.com
```

**Verification**:
```bash
# Test CORS from allowed origin
curl -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:8000/health

# Should return CORS headers
```

---

### 4. Fix npm Vulnerabilities (15 minutes)

**Action required**:

1. **Review and fix vulnerabilities**:
```bash
cd frontend

# See detailed vulnerability report
npm audit

# Attempt automatic fixes (non-breaking)
npm audit fix

# For breaking changes (review carefully first!)
npm audit fix --force

# Or manually update specific packages
npm install @svgr/webpack@latest
npm install css-select@latest
```

2. **Test after updates**:
```bash
# Run tests
npm test -- --watchAll=false

# Build to ensure no breaking changes
npm run build

# Run the app
npm start
```

**Warning**: `npm audit fix --force` may introduce breaking changes. Test thoroughly in a development environment first.

---

## 🟠 HIGH PRIORITY: Implement Within 24-48 Hours

### 5. Add Rate Limiting (30 minutes)

**Installation**:
```bash
cd backend
pip install slowapi
```

**Implementation**:

1. **Update requirements.txt**:
```bash
echo "slowapi==0.1.9" >> requirements.txt
```

2. **Add to server.py** (after app creation):
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Initialize limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

3. **Apply to sensitive endpoints**:
```python
# Example: Rate limit login endpoint
@api_router.post("/login")
@limiter.limit("5/minute")  # 5 requests per minute per IP
async def login(request: Request, ...):
    ...

# Example: Rate limit registration
@api_router.post("/register")
@limiter.limit("3/hour")  # 3 registrations per hour per IP
async def register(request: Request, ...):
    ...
```

**Testing**:
```bash
# Test rate limiting
for i in {1..10}; do
    curl -X POST http://localhost:8000/api/login \
         -H "Content-Type: application/json" \
         -d '{"bigo_id":"test","password":"test"}'
    echo ""
done

# Should see rate limit error after 5 attempts
```

---

### 6. Configure MongoDB Authentication (20 minutes)

**Action required**:

1. **Update docker-compose.yml** - Uncomment the authentication lines:
```yaml
mongodb:
  environment:
    MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME}
    MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
```

2. **Generate strong MongoDB credentials**:
```bash
# Add to .env.production
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=$(openssl rand -base64 24)
```

3. **Update MongoDB connection string**:
```bash
# In .env.production
MONGO_URL=mongodb://${MONGO_ROOT_USERNAME}:${MONGO_ROOT_PASSWORD}@mongodb:27017
```

4. **Restart services**:
```bash
docker-compose down
docker-compose up -d
```

**Verification**:
```bash
# Test connection
docker exec -it lvl-up-mongodb mongosh -u admin -p yourpassword --authenticationDatabase admin

# Inside mongosh
use lvl_up_agency
db.users.countDocuments()
```

---

### 7. Set Up SSL/TLS (60 minutes)

**For Production Deployment**:

1. **Install Certbot** (Let's Encrypt):
```bash
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx
```

2. **Obtain SSL Certificate**:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

3. **Update nginx configuration** (in frontend/nginx.conf):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # ... rest of configuration
}
```

4. **Auto-renewal**:
```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot will automatically set up cron job for renewal
```

---

## 🟡 MEDIUM PRIORITY: Implement Within 1 Week

### 8. Improve Logging (30 minutes)

**Add to server.py**:
```python
import logging.handlers
import os

# Configure production logging
if os.environ.get('ENVIRONMENT') == 'production':
    # Ensure log directory exists
    log_dir = '/var/log/lvl-up-agency'
    os.makedirs(log_dir, exist_ok=True)
    
    # Rotating file handler
    handler = logging.handlers.RotatingFileHandler(
        f'{log_dir}/app.log',
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    
    # Detailed formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
    )
    handler.setFormatter(formatter)
    
    # Add handler to root logger
    logging.getLogger().addHandler(handler)
    
    # Also log to stderr for Docker
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logging.getLogger().addHandler(console_handler)
```

---

### 9. Add Security Headers Middleware (20 minutes)

**Add to server.py** (before route definitions):
```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware

# Trusted host middleware (production only)
if os.environ.get('ENVIRONMENT') == 'production':
    allowed_hosts = os.environ.get('ALLOWED_HOSTS', '').split(',')
    if allowed_hosts:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=allowed_hosts
        )

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    
    # Only add HSTS in production with HTTPS
    if os.environ.get('ENVIRONMENT') == 'production':
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response
```

**Environment variables**:
```bash
# .env.production
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,api.yourdomain.com
```

---

### 10. Set Up MongoDB Backups (45 minutes)

**Create backup script** (`scripts/backup_mongodb.sh`):
```bash
#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/backups/mongodb"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="lvl_up_agency_${TIMESTAMP}"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Perform backup
docker exec lvl-up-mongodb mongodump \
    --db lvl_up_agency \
    --out /tmp/${BACKUP_NAME}

# Copy backup from container
docker cp lvl-up-mongodb:/tmp/${BACKUP_NAME} ${BACKUP_DIR}/

# Compress backup
cd ${BACKUP_DIR}
tar -czf ${BACKUP_NAME}.tar.gz ${BACKUP_NAME}
rm -rf ${BACKUP_NAME}

# Clean up old backups
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
```

**Make executable**:
```bash
chmod +x scripts/backup_mongodb.sh
```

**Add to crontab** (daily at 2 AM):
```bash
crontab -e

# Add this line:
0 2 * * * /path/to/lvl-up-agency/scripts/backup_mongodb.sh >> /var/log/mongodb_backup.log 2>&1
```

**Test restore**:
```bash
# Extract backup
cd /backups/mongodb
tar -xzf lvl_up_agency_20251112_020000.tar.gz

# Restore
docker cp lvl_up_agency_20251112_020000 lvl-up-mongodb:/tmp/
docker exec lvl-up-mongodb mongorestore \
    --db lvl_up_agency \
    /tmp/lvl_up_agency_20251112_020000/lvl_up_agency
```

---

## 📋 Verification Checklist

After implementing all security improvements:

### Critical Security
- [ ] axios updated to 1.12.0+ (check `npm list axios`)
- [ ] JWT_SECRET set and >= 32 characters
- [ ] CORS_ORIGINS explicitly configured (no '*')
- [ ] High-severity npm vulnerabilities fixed
- [ ] Rate limiting implemented and tested
- [ ] MongoDB authentication enabled
- [ ] SSL/TLS certificates installed

### Configuration
- [ ] All environment variables documented
- [ ] .env.production created and configured
- [ ] ENVIRONMENT variable set correctly
- [ ] Security headers middleware active
- [ ] Logging configured for production

### Infrastructure
- [ ] MongoDB backups running daily
- [ ] Backup restore tested successfully
- [ ] Health checks passing
- [ ] Docker containers starting correctly

### Testing
- [ ] Application starts without errors
- [ ] Login/authentication working
- [ ] API endpoints responding correctly
- [ ] Rate limiting triggering properly
- [ ] CORS allowing only configured origins

---

## 🚨 Common Issues and Solutions

### Issue: "JWT_SECRET environment variable is required"
**Solution**: Set JWT_SECRET in your .env file:
```bash
export JWT_SECRET=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
```

### Issue: "CORS_ORIGINS environment variable is required"
**Solution**: Set CORS_ORIGINS in your .env file:
```bash
export CORS_ORIGINS=https://yourdomain.com
```

### Issue: MongoDB authentication fails after enabling
**Solution**: Recreate the MongoDB container:
```bash
docker-compose down -v  # WARNING: This deletes data
docker-compose up -d
```

### Issue: Rate limiting not working
**Solution**: Ensure slowapi is installed and request is passed to endpoint:
```bash
pip install slowapi
# In endpoint definition, ensure: async def endpoint(request: Request, ...):
```

### Issue: SSL certificate errors
**Solution**: Ensure domain points to server and ports 80/443 are open:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## 📞 Need Help?

If you encounter issues during implementation:

1. **Check logs**:
   ```bash
   # Backend logs
   docker-compose logs -f backend
   
   # Frontend logs
   docker-compose logs -f frontend
   ```

2. **Review documentation**:
   - PRODUCTION_READINESS_ANALYSIS.md
   - SECURITY.md
   - DEPLOY.md

3. **Test in staging first**: Always test security changes in a non-production environment before deploying to production.

---

**Last Updated**: November 12, 2025  
**Version**: 1.0
