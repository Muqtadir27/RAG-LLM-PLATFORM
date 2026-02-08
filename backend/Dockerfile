# Use Node.js LTS (Long Term Support)
FROM node:20-slim

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy backend package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the backend application code
COPY . .

# Expose the port the app runs on
EXPOSE 3001

# Command to run the application
CMD [ "node", "server.js" ]
