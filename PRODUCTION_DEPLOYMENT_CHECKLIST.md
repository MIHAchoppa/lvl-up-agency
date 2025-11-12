# Production Deployment Checklist

A quick reference checklist for deploying Level Up Agency to production. Complete all items before going live.

**Last Updated**: November 12, 2025  
**Target Deployment Date**: _____________

---

## 🔴 CRITICAL - MUST COMPLETE (DO NOT SKIP)

### Security Vulnerabilities
- [ ] ✅ **FIXED**: Updated axios to version 1.12.0 in frontend/package.json
- [ ] ✅ **FIXED**: Updated axios to version 1.12.0 in root package.json  
- [ ] ✅ **FIXED**: JWT_SECRET now requires explicit configuration
- [ ] ✅ **FIXED**: CORS_ORIGINS now requires explicit configuration
- [ ] **Run**: `cd frontend && npm install` to update dependencies
- [ ] **Run**: `cd frontend && npm audit` to verify vulnerabilities fixed
- [ ] **Verify**: No critical or high vulnerabilities remain

### Environment Configuration
- [ ] Generate strong JWT_SECRET (min 32 characters):
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  ```
- [ ] Set JWT_SECRET in production environment
- [ ] Set ENVIRONMENT=production
- [ ] Configure CORS_ORIGINS with production domains only
- [ ] Generate MongoDB credentials (username & password)
- [ ] Update MONGO_URL with authentication credentials
- [ ] Set all required environment variables in .env.production

### Required Environment Variables
```bash
# Copy this template to .env.production and fill in values

# Critical Security
JWT_SECRET=<your-32-char-secret-here>
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
ENVIRONMENT=production

# MongoDB
MONGO_URL=mongodb://username:password@mongodb:27017
DB_NAME=lvl_up_agency
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=<strong-password>

# Server
PORT=8000
HOST=0.0.0.0
```

---

## 🟠 HIGH PRIORITY - COMPLETE BEFORE LAUNCH

### Security Hardening
- [ ] Install and configure rate limiting (slowapi)
- [ ] Test rate limiting on login endpoint (max 5 attempts/min)
- [ ] Enable MongoDB authentication in docker-compose.yml
- [ ] Test MongoDB connection with authentication
- [ ] Obtain SSL/TLS certificates (Let's Encrypt)
- [ ] Configure nginx for HTTPS
- [ ] Set up HTTPS redirect (HTTP → HTTPS)
- [ ] Test SSL certificate with SSL Labs (https://www.ssllabs.com/ssltest/)

### Infrastructure
- [ ] Configure firewall rules (allow 80, 443, block others)
- [ ] Set up automated MongoDB backups (daily)
- [ ] Test backup restore procedure
- [ ] Configure log rotation
- [ ] Set up monitoring (health checks)
- [ ] Configure error tracking (optional: Sentry)

---

## 🟡 MEDIUM PRIORITY - COMPLETE WITHIN FIRST WEEK

### Monitoring & Logging
- [ ] Configure production logging to file
- [ ] Set up log aggregation (optional)
- [ ] Configure uptime monitoring
- [ ] Set up alerts for critical errors
- [ ] Monitor disk space usage
- [ ] Monitor MongoDB performance

### Documentation
- [ ] Document production deployment steps
- [ ] Create runbook for common operations
- [ ] Document backup/restore procedures
- [ ] Document rollback procedures
- [ ] Update README with production info
- [ ] Create incident response plan

---

## ✅ PRE-LAUNCH TESTING

### Functional Testing
- [ ] Test user registration
- [ ] Test user login
- [ ] Test password reset (if implemented)
- [ ] Test all API endpoints
- [ ] Test file uploads
- [ ] Test WebSocket connections
- [ ] Test admin panel access
- [ ] Test mobile responsiveness

### Security Testing
- [ ] Verify CORS only allows configured origins
- [ ] Test rate limiting triggers correctly
- [ ] Verify JWT tokens expire properly
- [ ] Test authentication required for protected routes
- [ ] Verify MongoDB authentication works
- [ ] Test SSL/TLS connection
- [ ] Run security scan (optional: OWASP ZAP)

### Performance Testing
- [ ] Test with expected user load
- [ ] Monitor CPU and memory usage
- [ ] Test database query performance
- [ ] Verify caching works correctly
- [ ] Test under high concurrent users
- [ ] Identify and fix bottlenecks

### Disaster Recovery Testing
- [ ] Test MongoDB backup creation
- [ ] Test MongoDB restore from backup
- [ ] Test application recovery after crash
- [ ] Document recovery time objective (RTO)
- [ ] Document recovery point objective (RPO)

---

## 🚀 DEPLOYMENT DAY

### Pre-Deployment (T-4 hours)
- [ ] Notify users of upcoming deployment
- [ ] Create final backup of production data (if updating)
- [ ] Review deployment plan with team
- [ ] Verify all environment variables set
- [ ] Verify SSL certificates valid
- [ ] Test deployment in staging environment

### Deployment (T-0)
- [ ] Put application in maintenance mode (if updating)
- [ ] Pull latest code from main branch
- [ ] Build Docker images
- [ ] Run database migrations (if any)
- [ ] Start services with docker-compose
- [ ] Verify all containers healthy
- [ ] Run smoke tests

### Post-Deployment (T+0 to T+24h)
- [ ] Verify application accessible via HTTPS
- [ ] Test user login and registration
- [ ] Monitor error logs for issues
- [ ] Check server resource usage
- [ ] Verify MongoDB backups running
- [ ] Monitor for 24 hours
- [ ] Send deployment success notification

---

## 📊 Health Check Commands

### Quick Health Check
```bash
# Check all services running
docker-compose ps

# Check backend health
curl https://yourdomain.com/health

# Check frontend accessible
curl -I https://yourdomain.com

# Check SSL certificate
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Check MongoDB
docker exec lvl-up-mongodb mongosh --eval "db.adminCommand('ping')"
```

### Check Logs
```bash
# View all logs
docker-compose logs --tail=100

# View backend logs
docker-compose logs -f backend

# View frontend logs  
docker-compose logs -f frontend

# View MongoDB logs
docker-compose logs -f mongodb
```

### Resource Monitoring
```bash
# Check disk space
df -h

# Check memory usage
free -m

# Check Docker resource usage
docker stats

# Check MongoDB size
docker exec lvl-up-mongodb mongosh --eval "db.stats()"
```

---

## 🔧 Common Deployment Issues

### Issue: Services won't start
**Check**: `docker-compose logs` for error messages  
**Common causes**: Missing environment variables, port conflicts  
**Solution**: Verify .env.production has all required variables

### Issue: Cannot connect to MongoDB
**Check**: MongoDB authentication enabled but credentials not set  
**Solution**: Verify MONGO_URL includes username:password

### Issue: CORS errors in browser
**Check**: CORS_ORIGINS environment variable  
**Solution**: Ensure production domain in CORS_ORIGINS

### Issue: JWT authentication fails
**Check**: JWT_SECRET environment variable set  
**Solution**: Generate and set strong JWT_SECRET

### Issue: SSL certificate errors
**Check**: Certificate installed and nginx configured  
**Solution**: Run certbot and update nginx config

---

## 📞 Emergency Contacts

**Team Lead**: ________________  
**DevOps**: ________________  
**Database Admin**: ________________  
**Security Lead**: ________________  

---

## 🎯 Success Criteria

Deployment is successful when:

- [ ] ✅ Application accessible via HTTPS
- [ ] ✅ All health checks passing
- [ ] ✅ User authentication working
- [ ] ✅ No critical errors in logs
- [ ] ✅ Database backups running
- [ ] ✅ Monitoring and alerts active
- [ ] ✅ SSL certificate valid
- [ ] ✅ All security checks passing
- [ ] ✅ Performance within acceptable limits
- [ ] ✅ Zero critical vulnerabilities

---

## 📝 Sign-Off

**Security Review**:  
Name: ________________ Date: ________ Signature: ____________

**Technical Review**:  
Name: ________________ Date: ________ Signature: ____________

**Deployment Lead**:  
Name: ________________ Date: ________ Signature: ____________

---

## 📚 Related Documents

- [Production Readiness Analysis](./PRODUCTION_READINESS_ANALYSIS.md) - Detailed analysis
- [Security Improvements Guide](./SECURITY_IMPROVEMENTS_GUIDE.md) - Implementation steps
- [Deployment Guide](./DEPLOY.md) - Detailed deployment instructions
- [Security Policy](./SECURITY.md) - Security best practices

---

**Version**: 1.0  
**Last Updated**: November 12, 2025
