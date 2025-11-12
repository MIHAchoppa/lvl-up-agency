FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user and set ownership
RUN (getent group 1000 || addgroup -g 1000 appuser) && \
    (getent passwd 1000 || adduser -D -u 1000 -G $(getent group 1000 | cut -d: -f1) appuser) && \
    chown -R $(getent passwd 1000 | cut -d: -f1):$(getent group 1000 | cut -d: -f1) /app
USER 1000:1000

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if(r.statusCode !== 200) throw new Error()})" || exit 1

# Run the application
CMD ["npm", "start"]
