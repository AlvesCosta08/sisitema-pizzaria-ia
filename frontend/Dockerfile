# frontend/Dockerfile

# --- Estágio de desenvolvimento ---
FROM node:20-alpine as dev
WORKDIR /app
COPY package*.json ./
RUN npm install
CMD ["npm", "start"]

# --- Estágio de produção (build estático) ---
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# O build é copiado manualmente para ./frontend/build (ou via script)