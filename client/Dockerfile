# Stage 1: Build stage with Node.js 22
FROM node:22-alpine AS build

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies needed for building the Vite application
RUN npm ci

# Accept build arguments for Vite environment variables
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_BACKEND_URL
ARG VITE_BASE_URL

# Set environment variables for Vite build process
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_BASE_URL=$VITE_BASE_URL

# Copy frontend source files
COPY . .

# Build production bundle to dist/
RUN npm run build

# Stage 2: Production runtime stage with Nginx
FROM nginx:alpine

# Copy custom Nginx configuration for React SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose HTTP port 80
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
