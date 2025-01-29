# Stage 1: Build Frontend and Backend
FROM node:20-alpine as builder
WORKDIR /app

# Set React environment variables for build
ENV REACT_APP_API_URL=http://localhost:3000/api
ENV REACT_APP_SOCKET_URL=http://localhost:3000

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies using workspaces
RUN npm ci

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Stage 2: Production
FROM mongo:8.0
WORKDIR /app

# Install Node.js and curl
RUN apt-get update && apt-get install -y \
    curl \
    nodejs && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy built applications and dependencies
COPY --from=builder /app/client/build ./client/build
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Create data directories
VOLUME ["/app/database/data", "/app/logs"]
RUN mkdir -p /app/database/data /app/logs

# Environment variables
ENV NODE_ENV=production
ENV MONGODB_URI=mongodb://127.0.0.1:27017/ontrak

# Expose frontend port
EXPOSE 3000

# Copy and set entrypoint
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"] 