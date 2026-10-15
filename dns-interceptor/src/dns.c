#include "dns.h"

#include <arpa/inet.h>
#include <stdio.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/time.h>
#include <unistd.h>

int dns_parse_qname(const uint8_t *buffer, size_t buffer_len, size_t offset,
                    char *out_domain, size_t out_len) {
  if (!buffer || !out_domain || offset >= buffer_len || out_len == 0) {
    return -1;
  }

  size_t curr = offset;
  size_t out_idx = 0;
  out_domain[0] = '\0';

  while (curr < buffer_len) {
    uint8_t len = buffer[curr++];

    if (len == 0) {
      if (out_idx > 0) {
        out_domain[out_idx - 1] = '\0';
      }
      return (int)curr;
    }

    if ((len & 0xC0) == 0xC0) {
      if (curr >= buffer_len)
        return -1;
      curr++;
      if (out_idx > 0) {
        out_domain[out_idx - 1] = '\0';
      }
      return (int)curr;
    }

    if (curr + len > buffer_len || out_idx + len + 1 >= out_len) {
      return -1;
    }

    for (uint8_t i = 0; i < len; i++) {
      out_domain[out_idx++] = (char)buffer[curr++];
    }
    out_domain[out_idx++] = '.';
  }

  return -1;
}

ssize_t dns_forward_query(const char *upstream_ip, int upstream_port,
                          const uint8_t *query_buf, size_t query_len,
                          uint8_t *response_buf, size_t response_max_len) {
  int sock = socket(AF_INET, SOCK_DGRAM, 0);
  if (sock < 0) {
    perror("Error creando socket para upstream DNS");
    return -1;
  }

  struct timeval tv;
  tv.tv_sec = 2;
  tv.tv_usec = 0;
  setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));

  struct sockaddr_in upstream_addr;
  memset(&upstream_addr, 0, sizeof(upstream_addr));
  upstream_addr.sin_family = AF_INET;
  upstream_addr.sin_port = htons(upstream_port);
  if (inet_pton(AF_INET, upstream_ip, &upstream_addr.sin_addr) <= 0) {
    perror("Dirección IP upstream inválida");
    close(sock);
    return -1;
  }

  ssize_t sent =
      sendto(sock, query_buf, query_len, 0, (struct sockaddr *)&upstream_addr,
             sizeof(upstream_addr));
  if (sent < 0) {
    perror("Error enviando consulta a upstream DNS");
    close(sock);
    return -1;
  }

  ssize_t received =
      recvfrom(sock, response_buf, response_max_len, 0, NULL, NULL);
  if (received < 0) {
    perror("Timeout o error esperando respuesta de upstream DNS");
    close(sock);
    return -1;
  }

  close(sock);
  return received;
}
