# Frontend Dockerfile - Multi-stage build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# We will use the builder stage to run the dev server 
# so the vite.config.ts proxy works in Docker Compose.

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
