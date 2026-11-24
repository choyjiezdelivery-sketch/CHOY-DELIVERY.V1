# Production Dockerfile for ChoyJiez DELIVERY (Render / Docker hosts)
FROM node:22-alpine AS base

WORKDIR /app

# Install all dependencies (including vite/tailwindcss build tools)
COPY package*.json ./
RUN npm install --include=dev

# Copy application source
COPY . .

# Optional build-time Vite Firebase public env vars (Render passes Env Vars as build args when declared with ARG)
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_PROJECT_ID=gen-lang-client-0125944006
ARG VITE_FIREBASE_DATABASE_ID=ai-studio-choyjiez-fdb2715d-1f62-41f8-bdf4-44891517ae6a
ARG VITE_FIREBASE_AUTH_DOMAIN=gen-lang-client-0125944006.firebaseapp.com
ARG VITE_FIREBASE_STORAGE_BUCKET=gen-lang-client-0125944006.firebasestorage.app
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=119087823167
ARG VITE_FIREBASE_APP_ID=1:119087823167:web:0619539cee5db1d9eebb8a

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_DATABASE_ID=$VITE_FIREBASE_DATABASE_ID \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

# Build client assets into dist/
RUN npm run build

# Runtime settings
ENV NODE_ENV=production \
    PORT=10000

EXPOSE 10000

CMD ["./node_modules/.bin/tsx", "server.ts"]
