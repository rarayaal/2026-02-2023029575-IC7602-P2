# Multi-stage build para Zonal Cache en GNU C
FROM gcc:12-bookworm AS builder

WORKDIR /app

# Instalar dependencias de desarrollo (libcurl para HTTPS cliente)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcurl4-openssl-dev \
    make \
    && rm -rf /var/lib/apt/lists/*

COPY . .

RUN if [ -d "zonal-cache" ]; then \
        make -C zonal-cache server && cp zonal-cache/build/zonal_cache_server /app/zonal_cache_server; \
    else \
        make server && cp build/zonal_cache_server /app/zonal_cache_server; \
    fi

# Etapa 2: Imagen final liviana
FROM debian:bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libcurl4 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/zonal_cache_server /app/zonal_cache_server

# Variables de entorno por defecto (inyectables en Kubernetes)
ENV PORT=8080
ENV CACHE_DIR=/var/cache/zonal-cache
ENV ORIGIN_HOST=httpbin.org
ENV ORIGIN_PORT=80
ENV AUTH_MODE=api_key

RUN mkdir -p /var/cache/zonal-cache

EXPOSE 8080

CMD ["/app/zonal_cache_server"]
