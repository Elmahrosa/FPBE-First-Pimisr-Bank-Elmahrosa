FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Expose Metro bundler port
EXPOSE 8081

# React Native Metro command (for dev)
CMD ["npm", "start"]

