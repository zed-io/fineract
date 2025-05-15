FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY tsconfig.json ./
COPY dist ./dist

# Expose WebSocket port
EXPOSE 4001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=4001

# Run the application
CMD ["node", "dist/index.js"]