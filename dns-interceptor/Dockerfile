# Etapa de compilación
FROM gcc:12-bookworm AS builder

WORKDIR /app

# libcurl para consultar los dominios verificados al REST API en Node.js
RUN apt-get update && apt-get install -y --no-install-recommends libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY Makefile ./
COPY config/ ./config/
COPY include/ ./include/
COPY src/ ./src/
COPY tests/ ./tests/

# Compila y ejecuta los tests unitarios durante el build
RUN make test && make

# Etapa final de ejecución
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends libcurl4 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/dns-interceptor /app/dns-interceptor
COPY --from=builder /app/config/ /app/config/

# Puerto estándar de DNS
EXPOSE 53/udp

# Variables de entorno por defecto
ENV INTERCEPTOR_BIND_ADDR=0.0.0.0 \
    INTERCEPTOR_UDP_PORT=53 \
    UPSTREAM_DNS_IP=8.8.8.8 \
    UPSTREAM_DNS_PORT=53 \
    GEO_DB_PATH=/app/config/ip_to_country.csv

CMD ["/app/dns-interceptor"]
