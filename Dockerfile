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
FROM mongo:6.0
WORKDIR /app

# Install Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy backend and frontend
COPY --from=backend-builder /app/server ./server
COPY --from=frontend-builder /app/client/build ./client/build

# Create data directories
VOLUME ["/app/database/data", "/app/logs"]
RUN mkdir -p /app/database/data /app/logs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV MONGODB_URI=mongodb://127.0.0.1:27017/ontrak

# Expose frontend port
EXPOSE 3000

# Copy and set entrypoint
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"] 