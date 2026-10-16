#ifndef DNS_H
#define DNS_H

#include <netinet/in.h>
#include <stddef.h>
#include <stdint.h>

#define DNS_PORT_DEFAULT 5353
#define DNS_BUFFER_SIZE 4096
#define DNS_TYPE_A 1
#define DNS_CLASS_IN 1

#pragma pack(push, 1)
typedef struct {
  uint16_t id;      /* Identificador de la transacción */
  uint16_t flags;   /* Banderas del protocolo DNS */
  uint16_t qdcount; /* Cantidad de preguntas */
  uint16_t ancount; /* Cantidad de respuestas */
  uint16_t nscount; /* Registros de autoridad */
  uint16_t arcount; /* Registros adicionales */
} dns_header_t;
#pragma pack(pop)

/* Parsea un QNAME en formato DNS a nombre legible FQDN */
int dns_parse_qname(const uint8_t *buffer, size_t buffer_len, size_t offset,
                    char *out_domain, size_t out_len);

/* Reenvía la petición DNS al servidor upstream recursivo */
ssize_t dns_forward_query(const char *upstream_ip, int upstream_port,
                          const uint8_t *query_buf, size_t query_len,
                          uint8_t *response_buf, size_t response_max_len);

/* Construye la respuesta DNS binaria con un registro A hacia la caché zonal */
ssize_t dns_build_response(const uint8_t *query_buf, size_t query_len,
                           const char *ip_str, uint32_t ttl, uint8_t *resp_buf,
                           size_t resp_max_len);

#endif /* DNS_H */
