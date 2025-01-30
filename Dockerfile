# Stage 1: Build Frontend
FROM node:20-alpine as frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ .
ENV HOST=0.0.0.0
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine as backend-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ .

# Stage 3: Production
FROM ubuntu:20.04
WORKDIR /app

# Install MongoDB 4.4
RUN apt-get update && \
    apt-get install -y curl gnupg && \
    curl -fsSL https://www.mongodb.org/static/pgp/server-4.4.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-org-4.4.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/mongodb-org-4.4.gpg] http://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-4.4.list && \
    apt-get update && \
    apt-get install -y mongodb-org && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy built applications
COPY --from=backend-builder /app/server ./server
COPY --from=frontend-builder /app/client/build ./client/build

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