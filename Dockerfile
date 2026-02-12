# Use Node.js LTS
FROM node:20-slim

# Use a consistent app dir matching common Node containers
WORKDIR /usr/src/app

# Copy backend dependencies first for caching
COPY backend/package*.json ./

# Install dependencies
RUN npm install --production

# Copy backend source
COPY backend/ .

# Copy frontend source (so server.js can serve it from ../frontend)
COPY frontend/ ../frontend/

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
