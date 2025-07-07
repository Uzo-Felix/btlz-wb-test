FROM node:20-alpine AS deps-prod

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

FROM deps-prod AS build

# Install all dependencies including dev
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

FROM node:20-alpine AS prod

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Create directories
RUN mkdir -p logs config
RUN chown -R nodejs:nodejs /app

# Copy built application
COPY --from=build /app/package*.json ./
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Copy configuration directory
COPY --from=build /app/config ./config

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["npm", "run", "start"]