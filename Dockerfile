# Build stage
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Ensure public directory exists
RUN mkdir -p public/uploads

RUN npm run build

# Production stage
FROM node:20-alpine AS runner

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create data directory for SQLite and uploads
RUN mkdir -p /data/uploads

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy package files and reinstall better-sqlite3 for this architecture
COPY --from=builder /app/package.json ./
RUN npm install better-sqlite3 --build-from-source

# Copy node_modules from builder (except better-sqlite3 which we just rebuilt)
COPY --from=builder /app/node_modules ./node_modules
RUN rm -rf ./node_modules/better-sqlite3 && \
    cp -r /app/node_modules/better-sqlite3 ./node_modules/

EXPOSE 3000

CMD ["node", "server.js"]
