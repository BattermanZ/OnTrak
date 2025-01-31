# Build stage
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Production stage
FROM ubuntu:20.04
WORKDIR /app

# Install MongoDB 4.4 and Node.js in a single layer to reduce image size
RUN apt-get update && \
    apt-get install -y curl gnupg && \
    curl -fsSL https://www.mongodb.org/static/pgp/server-4.4.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-org-4.4.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/mongodb-org-4.4.gpg] http://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-4.4.list && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get update && \
    apt-get install -y mongodb-org nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=builder /app ./

# Create required directories
RUN mkdir -p /app/database/data /app/logs /app/backups

# Set volumes
VOLUME ["/app/database/data", "/app/logs", "/app/backups"]

# Environment variables
ENV NODE_ENV=production \
    PORT=3456 \
    HOST=0.0.0.0 \
    MONGODB_URI=mongodb://127.0.0.1:27017/ontrak

# Expose ports
EXPOSE 3456

# Copy entrypoint script
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"] 