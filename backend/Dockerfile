# Use a small, current LTS Node image — 'alpine' = stripped-down Linux, smaller image
FROM node:20-alpine

# Everything from here on happens inside this folder in the container
WORKDIR /app

# Copy ONLY package files first, not the whole app yet — explained below
COPY package*.json ./

# Install dependencies exactly as locked in package-lock.json; skip devDependencies (nodemon etc)
RUN npm ci --omit=dev

# Now copy the rest of the actual source code
COPY . .

# Document which port this container listens on (informational — doesn't actually open it)
EXPOSE 5000

# Run as a non-root user for security — the base image already ships a 'node' user
USER node

# The command that runs when the container starts
CMD ["node", "server.js"]