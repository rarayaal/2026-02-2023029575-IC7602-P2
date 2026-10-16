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

ssize_t dns_build_response(const uint8_t *query_buf, size_t query_len,
                           const char *ip_str, uint32_t ttl, uint8_t *resp_buf,
                           size_t resp_max_len) {
  if (!query_buf || !ip_str || !resp_buf || query_len < 12) {
    return -1;
  }

  /* Ubica el fin de la sección Question */
  size_t cursor = 12;
  while (cursor < query_len) {
    uint8_t label_len = query_buf[cursor];
    if (label_len == 0) {
      cursor++;
      break;
    }
    if ((label_len & 0xC0) == 0xC0) {
      cursor += 2;
      break;
    }
    cursor += 1 + label_len;
  }

  size_t question_end = cursor + 4;
  if (question_end > query_len) {
    return -1;
  }

  size_t total_resp_len = question_end + 16;
  if (total_resp_len > resp_max_len) {
    return -1;
  }

  /* Copia el identificador original */
  resp_buf[0] = query_buf[0];
  resp_buf[1] = query_buf[1];

  /* Establece banderas de respuesta autoritativa */
  uint8_t rd = query_buf[2] & 0x01;
  resp_buf[2] = 0x84 | rd;
  resp_buf[3] = 0x80;

  /* Establece contadores del protocolo */
  resp_buf[4] = 0x00;
  resp_buf[5] = 0x01;
  resp_buf[6] = 0x00;
  resp_buf[7] = 0x01;
  resp_buf[8] = 0x00;
  resp_buf[9] = 0x00;
  resp_buf[10] = 0x00;
  resp_buf[11] = 0x00;

  /* Copia la sección Question */
  memcpy(&resp_buf[12], &query_buf[12], question_end - 12);

  /* Agrega la sección Answer con el registro A */
  size_t a_offset = question_end;
  resp_buf[a_offset++] = 0xC0;
  resp_buf[a_offset++] = 0x0C;
  resp_buf[a_offset++] = 0x00;
  resp_buf[a_offset++] = 0x01;
  resp_buf[a_offset++] = 0x00;
  resp_buf[a_offset++] = 0x01;

  uint32_t net_ttl = htonl(ttl);
  memcpy(&resp_buf[a_offset], &net_ttl, 4);
  a_offset += 4;

  resp_buf[a_offset++] = 0x00;
  resp_buf[a_offset++] = 0x04;

  struct in_addr addr;
  if (inet_pton(AF_INET, ip_str, &addr) <= 0) {
    return -1;
  }
  memcpy(&resp_buf[a_offset], &addr, 4);
  a_offset += 4;

  return (ssize_t)a_offset;
}
