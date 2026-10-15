#include "dns.h"

#include <arpa/inet.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <unistd.h>

static volatile int g_running = 1;

static void handle_signal(int sig) {
  (void)sig;
  g_running = 0;
}

int main(void) {
  signal(SIGINT, handle_signal);
  signal(SIGTERM, handle_signal);

  /* Carga variables de entorno sin valores fijos en código */
  const char *bind_addr_str = getenv("INTERCEPTOR_BIND_ADDR");
  if (!bind_addr_str)
    bind_addr_str = "0.0.0.0";

  const char *port_env = getenv("INTERCEPTOR_UDP_PORT");
  int port = port_env ? atoi(port_env) : DNS_PORT_DEFAULT;

  const char *upstream_ip = getenv("UPSTREAM_DNS_IP");
  if (!upstream_ip)
    upstream_ip = "8.8.8.8";

  const char *upstream_port_env = getenv("UPSTREAM_DNS_PORT");
  int upstream_port = upstream_port_env ? atoi(upstream_port_env) : 53;

  int server_sock = socket(AF_INET, SOCK_DGRAM, 0);
  if (server_sock < 0) {
    perror("Error al crear socket UDP");
    return EXIT_FAILURE;
  }

  int opt = 1;
  setsockopt(server_sock, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

  struct sockaddr_in server_addr;
  memset(&server_addr, 0, sizeof(server_addr));
  server_addr.sin_family = AF_INET;
  server_addr.sin_port = htons(port);
  if (inet_pton(AF_INET, bind_addr_str, &server_addr.sin_addr) <= 0) {
    perror("Dirección de enlace inválida");
    close(server_sock);
    return EXIT_FAILURE;
  }

  if (bind(server_sock, (struct sockaddr *)&server_addr, sizeof(server_addr)) <
      0) {
    perror("Error en bind del socket UDP");
    close(server_sock);
    return EXIT_FAILURE;
  }

  printf("[DNS Interceptor] Escuchando en udp://%s:%d\n", bind_addr_str, port);
  printf("[DNS Interceptor] Upstream recursivo configurado en %s:%d\n",
         upstream_ip, upstream_port);

  uint8_t buffer[DNS_BUFFER_SIZE];
  uint8_t resp_buf[DNS_BUFFER_SIZE];

  while (g_running) {
    struct sockaddr_in client_addr;
    socklen_t client_len = sizeof(client_addr);

    ssize_t bytes_recv = recvfrom(server_sock, buffer, sizeof(buffer), 0,
                                  (struct sockaddr *)&client_addr, &client_len);
    if (bytes_recv < 0) {
      if (!g_running)
        break;
      perror("Error en recvfrom");
      continue;
    }

    if (bytes_recv < 12) {
      continue;
    }

    char client_ip[INET_ADDRSTRLEN];
    inet_ntop(AF_INET, &client_addr.sin_addr, client_ip, sizeof(client_ip));

    char domain[256];
    int next_offset =
        dns_parse_qname(buffer, (size_t)bytes_recv, 12, domain, sizeof(domain));

    if (next_offset < 0) {
      printf("[DNS Interceptor] Consulta malformada desde %s:%d\n", client_ip,
             ntohs(client_addr.sin_port));
      continue;
    }

    /* Reenvía la consulta al servidor upstream recursivo */
    printf("[DNS Interceptor] [FORWARDING] Consulta para '%s' desde %s -> "
           "Reenviando a %s:%d\n",
           domain, client_ip, upstream_ip, upstream_port);

    ssize_t fwd_len =
        dns_forward_query(upstream_ip, upstream_port, buffer,
                          (size_t)bytes_recv, resp_buf, sizeof(resp_buf));
    if (fwd_len > 0) {
      sendto(server_sock, resp_buf, (size_t)fwd_len, 0,
             (struct sockaddr *)&client_addr, client_len);
    }
  }

  printf("\n[DNS Interceptor] Cerrando servidor...\n");
  close(server_sock);
  return EXIT_SUCCESS;
}
