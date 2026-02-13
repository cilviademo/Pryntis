# Multi-stage Dockerfile for Pryntis Panel
# Builds the React client, then serves everything from Express

# ---- Stage 1: Build client ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install root + server deps
COPY package*.json ./
RUN npm ci --omit=dev

# Install client deps and build
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npx vite build

# ---- Stage 2: Production image ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy server + built client
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/client/dist ./client/dist
COPY server/ ./server/
COPY package.json ./

EXPOSE 5000
CMD ["node", "server/server.js"]
