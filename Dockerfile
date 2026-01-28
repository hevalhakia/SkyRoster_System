# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci

# Copy frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy from builder
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend ./frontend

# Install production dependencies only for backend
WORKDIR /app/backend
RUN npm ci --only=production

WORKDIR /app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose ports
EXPOSE 3000 5501

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start backend
CMD ["node", "backend/index.js"]
