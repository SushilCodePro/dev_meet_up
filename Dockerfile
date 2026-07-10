# Use official Node.js 18 LTS image based on Alpine Linux
FROM node:18-alpine AS base

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json (if present) first for caching dependencies
COPY package.json ./
COPY package-lock.json ./

# Install production dependencies (skip optional dev dependencies)
RUN npm ci --omit=dev && npm cache clean --force

# Copy the rest of the application source code
COPY . .

# Expose the port the app listens on (adjust if your app uses a different port)
EXPOSE 3000

# Set environment variable for production
ENV NODE_ENV=production

# Command to run the application. Adjust if your entry point differs.
CMD [ "node", "app.js" ]
