# Stage 1: Build Frontend
FROM node:20-alpine AS builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Setup Backend & Run
FROM node:20-alpine

WORKDIR /app

# Install Server Dependencies
COPY server/package*.json ./
RUN npm ci --only=production

# Copy Server Code
COPY server/ ./

# Copy Frontend Build from Stage 1 to server/public
COPY --from=builder /app/client/dist ./public

# Create Uploads Directory
RUN mkdir -p uploads

# Expose Port
EXPOSE 3000

# Environment Variables Defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV UPLOAD_DIR=/app/uploads

# Start Command
CMD ["node", "src/index.js"]
