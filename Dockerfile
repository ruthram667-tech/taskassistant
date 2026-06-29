# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Production runtime
FROM node:22-alpine
WORKDIR /app
# Copy built assets and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
# Install only production dependencies
RUN npm install --omit=dev

# We don't strictly need a bind mount for code, but we will configure one 
# in docker-compose for user uploads/persistent data if needed.
EXPOSE 3000
CMD ["npm", "run", "start"]
