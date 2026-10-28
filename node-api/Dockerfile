FROM node:22-alpine AS runner

WORKDIR /app

# Instalar wget para healthcheck
RUN apk add --no-cache wget

# Copiar descriptores de dependencias e instalar dependencias de producción
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copiar código fuente del API
COPY server.js ./
COPY api/ ./api/
COPY src/ ./src/

# Configurar variables de entorno por defecto
ENV NODE_ENV=production \
    PORT=3000

# Exponer el puerto del API
EXPOSE 3000

# Usar usuario no privilegiado
USER node

# Healthcheck que verifica el endpoint /api/health (T-26)
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
