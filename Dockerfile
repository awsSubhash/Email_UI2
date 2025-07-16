# Stage 1: Build dependencies
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the application source code
COPY . .

# Stage 2: Production image
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app .

# Remove dev dependencies to slim down image
RUN npm prune --production

# Expose the port your app uses (change if needed)
EXPOSE 5000

# Run the application
CMD ["node", "server.js"]

