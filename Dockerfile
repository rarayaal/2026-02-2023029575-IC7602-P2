# ==========================================
# Etapa 1: Compilación (Build Stage con Node)
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copia de descriptores de dependencias
COPY package.json package-lock.json* ./

# Instalación estricta de dependencias
RUN npm ci || npm install

# Argumentos de compilación (ARG) para variables VITE_*
# Sin valores por defecto quemados: deben suministrarse desde el entorno o docker-compose
ARG VITE_API_BASE_URL
ARG VITE_APP_TITLE
ARG VITE_APP_ENV
ARG UI_PORT=5173
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID

# Definición de variables de entorno para el proceso de compilación
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_APP_ENV=$VITE_APP_ENV
ENV UI_PORT=$UI_PORT
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

# Copia del resto del código fuente del proyecto
COPY . .

# Generación del bundle de producción en /app/dist
RUN npm run build

# ==========================================
# Etapa 2: Servidor Web (Nginx Alpine)
# ==========================================
FROM nginx:alpine AS runner

# Copia de la configuración de Nginx personalizada con soporte para SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia de los archivos compilados desde la etapa builder
COPY --from=builder /app/dist /usr/share/nginx/html

# El servidor Nginx escucha internamente en el puerto 80
EXPOSE 80

# Inicio de Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]
