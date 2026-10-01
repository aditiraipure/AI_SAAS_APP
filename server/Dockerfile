# Use official Node.js 22 Alpine production-ready base image (Required for OpenAI 7.x)
FROM node:22-alpine

# Set working directory inside container
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Copy dependency manifests
COPY package*.json ./

# Install only production dependencies cleanly
RUN npm ci --omit=dev

# Copy backend application source code
COPY . .

# Expose backend API port
EXPOSE 5000

# Start Express server
CMD ["npm", "start"]
