# Use Node.js LTS
FROM node:20-slim

# Use a consistent app dir matching common Node containers
WORKDIR /usr/src/app

# Copy backend source (build context should be the `backend` folder)
COPY . .

# Install dependencies
RUN npm install --production

EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
