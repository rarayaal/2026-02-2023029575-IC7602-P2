# Etapa de compilación
FROM gcc:12-bullseye AS builder

WORKDIR /app
COPY Makefile ./
COPY include/ ./include/
COPY src/ ./src/
COPY tests/ ./tests/

# Compila y ejecuta los tests unitarios durante el build
RUN make test && make

# Etapa final de ejecución
FROM debian:bullseye-slim

WORKDIR /app
COPY --from=builder /app/dns-interceptor /app/dns-interceptor

# Puerto estándar de DNS
EXPOSE 53/udp

# Variables de entorno por defecto
ENV INTERCEPTOR_BIND_ADDR=0.0.0.0 \
    INTERCEPTOR_UDP_PORT=53 \
    UPSTREAM_DNS_IP=8.8.8.8 \
    UPSTREAM_DNS_PORT=53

CMD ["/app/dns-interceptor"]
