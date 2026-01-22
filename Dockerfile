FROM node:20-alpine

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including native modules)
RUN npm ci

# Copy source code
COPY . .

# Ensure directories exist
RUN mkdir -p public/uploads /data/uploads

# Build Next.js
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
