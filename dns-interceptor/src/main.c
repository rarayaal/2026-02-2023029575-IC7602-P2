#include "dns.h"
#include "domains.h"
#include "geo.h"

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

/* Carga dominios y asocia sus cachés zonales desde variables de entorno */
static void setup_registered_domains(const char *cache_cr, const char *cache_us,
                                     const char *cache_default) {
  domains_init();

  const char *domains_env = getenv("CONFIG_DOMAINS");
  if (domains_env && strlen(domains_env) > 0) {
    char buffer[1024];
    strncpy(buffer, domains_env, sizeof(buffer) - 1);
    buffer[sizeof(buffer) - 1] = '\0';

    char *token = strtok(buffer, ",; ");
    while (token) {
      domains_add(token, 300);
      domains_add_zonal_cache(token, "CR", cache_cr);
      domains_add_zonal_cache(token, "US", cache_us);
      domains_add_zonal_cache(token, "DEFAULT", cache_default);
      token = strtok(NULL, ",; ");
    }
  } else {
    /* Dominios de prueba estándar si no se define CONFIG_DOMAINS */
    domains_add("app.local", 300);
    domains_add_zonal_cache("app.local", "CR", cache_cr);
    domains_add_zonal_cache("app.local", "US", cache_us);
    domains_add_zonal_cache("app.local", "DEFAULT", cache_default);

    domains_add("api.redes.tec", 60);
    domains_add_zonal_cache("api.redes.tec", "CR", cache_cr);
    domains_add_zonal_cache("api.redes.tec", "US", cache_us);
    domains_add_zonal_cache("api.redes.tec", "DEFAULT", cache_default);
  }
}

int main(void) {
  signal(SIGINT, handle_signal);
  signal(SIGTERM, handle_signal);

  /* Carga variables de entorno para red y servicios */
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

  /* Carga IPs de cachés zonales desde variables de entorno */
  const char *cache_cr = getenv("ZONAL_CACHE_CR");
  if (!cache_cr)
    cache_cr = "192.168.1.100";

  const char *cache_us = getenv("ZONAL_CACHE_US");
  if (!cache_us)
    cache_us = "192.168.2.100";

  const char *cache_default = getenv("ZONAL_CACHE_DEFAULT");
  if (!cache_default)
    cache_default = "192.168.0.100";

  /* Inicializa geolocalización IP to Country y dominios administrados */
  geo_init();
  setup_registered_domains(cache_cr, cache_us, cache_default);

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
  printf("[DNS Interceptor] Upstream recursivo en %s:%d\n", upstream_ip,
         upstream_port);
  printf("[DNS Interceptor] Caché Zonal CR: %s | US: %s | DEFAULT: %s\n",
         cache_cr, cache_us, cache_default);

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

    registered_domain_t dom_info;
    if (domains_is_registered(domain, &dom_info)) {
      /* Resuelve el país del cliente mediante la base IP to Country */
      const char *country_code = geo_lookup_country(client_ip);
      const char *cache_ip =
          domains_get_cache_ip_for_country(&dom_info, country_code);

      printf("[DNS Interceptor] [INTERCEPTADO] Dominio '%s' | Cliente: %s "
             "(País: %s) -> Respondiendo Caché Zonal: %s\n",
             domain, client_ip, country_code ? country_code : "DESCONOCIDO",
             cache_ip);

      ssize_t resp_len =
          dns_build_response(buffer, (size_t)bytes_recv, cache_ip, dom_info.ttl,
                             resp_buf, sizeof(resp_buf));
      if (resp_len > 0) {
        sendto(server_sock, resp_buf, (size_t)resp_len, 0,
               (struct sockaddr *)&client_addr, client_len);
      }
    } else {
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
  }

  printf("\n[DNS Interceptor] Cerrando servidor...\n");
  close(server_sock);
  return EXIT_SUCCESS;
}
