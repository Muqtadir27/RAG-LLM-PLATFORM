# Use Node.js LTS
FROM node:20-slim

# Set working directory to /app
WORKDIR /usr/src/app

# Copy backend package files first (to cache dependencies)
# We copy them into a 'backend' directory inside the container
COPY backend/package*.json ./backend/

# Install dependencies inside the backend directory
WORKDIR /usr/src/app/backend
RUN npm install --production

# Move back to root context to copy source code
WORKDIR /usr/src/app

# Copy the entire backend and frontend directories
# This preserves the structure:
# /usr/src/app/backend
# /usr/src/app/frontend
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Expose port
EXPOSE 3001

# Start the server from the backend directory
WORKDIR /usr/src/app/backend
CMD ["node", "server.js"]
