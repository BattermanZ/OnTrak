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
FROM mongo:4.4
WORKDIR /app

# Create mongodb user if it doesn't exist
RUN if ! id -u mongodb > /dev/null 2>&1; then \
    groupadd -r mongodb && \
    useradd -r -g mongodb mongodb; \
fi

# Install Node.js and curl (needed for healthcheck)
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
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