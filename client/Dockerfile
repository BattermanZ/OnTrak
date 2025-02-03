# Build stage
FROM node:20-alpine as builder

# Production environment variables
ENV REACT_APP_BACKEND_URL=http://192.168.31.24:3456
ENV REACT_APP_LOG_LEVEL=debug
ENV NODE_ENV=production

WORKDIR /app

# Copy both package.json AND package-lock.json
COPY package*.json ./

# Add build argument for cache busting
ARG CACHEBUST=1

# First, clear npm cache and then install dependencies
RUN npm cache clean --force && \
    npm ci --prefer-offline --no-audit

# Copy the rest of the code
COPY . .

# Build the application
RUN npm run build

# Production stage - using nginx for lightweight static serving
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"] 