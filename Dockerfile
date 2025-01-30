# Stage 1: Build Frontend
FROM node:20-alpine as frontend-builder
WORKDIR /build
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine as backend-builder
WORKDIR /build
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ .

# Stage 3: Production
FROM mongo:8.0
WORKDIR /app

# Install Node.js and curl (needed for healthcheck)
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy built applications
COPY --from=backend-builder /build ./server
COPY --from=frontend-builder /build/build ./client/build

# Create required directories
RUN mkdir -p /app/database/data /app/logs /app/backups

# Set volumes
VOLUME ["/app/database/data", "/app/logs", "/app/backups"]

# Environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    MONGODB_URI=mongodb://127.0.0.1:27017/ontrak

# Expose port
EXPOSE 3000

# Copy entrypoint script
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"] 