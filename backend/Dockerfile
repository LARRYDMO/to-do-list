# Simple production Dockerfile for the To-Do backend
FROM node:18-alpine

WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy source
COPY . .

ENV NODE_ENV=production
# The app reads PORT from env; default to 3000
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
