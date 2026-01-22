# Build stage
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

RUN apk add --no-cache python3 make g++

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create data directory for SQLite and uploads
RUN mkdir -p /data/uploads

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Reinstall better-sqlite3 for production
COPY package.json ./
RUN npm install better-sqlite3 --build-from-source

EXPOSE 3000

CMD ["node", "server.js"]
