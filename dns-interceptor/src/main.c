#include "config_api.h"
#include "dns.h"
#include "domains.h"
#include "geo.h"

#include <arpa/inet.h>
#include <curl/curl.h>
#include <errno.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <time.h>
#include <unistd.h>

static volatile int g_running = 1;

static void handle_signal(int sig) {
  (void)sig;
  g_running = 0;
}

/* Registra un dominio y le asocia las cachés zonales de cada zona */
static void register_domain(const char *domain, const char *cache_cr,
                            const char *cache_us, const char *cache_default) {
  domains_add(domain, 300);
  domains_add_zonal_cache(domain, "CR", cache_cr);
  domains_add_zonal_cache(domain, "US", cache_us);
  domains_add_zonal_cache(domain, "DEFAULT", cache_default);
}

/*
 * Reemplaza la tabla con los dominios verificados del REST API en Node.js,
 * que los lee de Firestore. Si la consulta falla, la tabla actual se mantiene.
 */
static int load_domains_from_api(const char *api_url, const char *api_token,
                                 const char *cache_cr, const char *cache_us,
                                 const char *cache_default) {
  domain_list_t list;
  if (config_api_fetch_domains(api_url, api_token, &list) != 0)
    return -1;

  domains_init();
  for (size_t i = 0; i < list.count; i++)
    register_domain(list.names[i], cache_cr, cache_us, cache_default);

  printf("[DNS Interceptor] %zu dominio(s) verificado(s) cargado(s) desde el API\n",
         list.count);
  fflush(stdout);
  return 0;
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
      register_domain(token, cache_cr, cache_us, cache_default);
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

  /*
   * Dominios administrados: si CONFIG_API_URL y CONFIG_API_TOKEN están
   * definidos, son los dominios verificados del REST API (Firestore) y se
   * refrescan cada CONFIG_REFRESH_SECONDS. Si no, o si la primera consulta
   * falla, se usan los de CONFIG_DOMAINS.
   */
  const char *api_url = getenv("CONFIG_API_URL");
  const char *api_token = getenv("CONFIG_API_TOKEN");
  const char *refresh_env = getenv("CONFIG_REFRESH_SECONDS");
  int refresh_seconds = refresh_env ? atoi(refresh_env) : 30;
  if (refresh_seconds <= 0)
    refresh_seconds = 30;
  int use_api = api_url && strlen(api_url) > 0 && api_token && strlen(api_token) > 0;

  /* Inicializa geolocalización IP to Country y dominios administrados */
  geo_init();
  if (use_api) {
    curl_global_init(CURL_GLOBAL_DEFAULT);
    if (load_domains_from_api(api_url, api_token, cache_cr, cache_us,
                              cache_default) != 0) {
      printf("[DNS Interceptor] No se pudo consultar el API; se usa CONFIG_DOMAINS "
             "hasta el próximo intento\n");
      setup_registered_domains(cache_cr, cache_us, cache_default);
    }
  } else {
    setup_registered_domains(cache_cr, cache_us, cache_default);
  }
  time_t last_refresh = time(NULL);

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
  fflush(stdout);

  /* Con el API activo, recvfrom despierta cada segundo para poder refrescar */
  if (use_api) {
    struct timeval tv = {.tv_sec = 1, .tv_usec = 0};
    setsockopt(server_sock, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
  }

  uint8_t buffer[DNS_BUFFER_SIZE];
  uint8_t resp_buf[DNS_BUFFER_SIZE];

  while (g_running) {
    if (use_api && time(NULL) - last_refresh >= refresh_seconds) {
      load_domains_from_api(api_url, api_token, cache_cr, cache_us,
                            cache_default);
      last_refresh = time(NULL);
    }

    struct sockaddr_in client_addr;
    socklen_t client_len = sizeof(client_addr);

    ssize_t bytes_recv = recvfrom(server_sock, buffer, sizeof(buffer), 0,
                                  (struct sockaddr *)&client_addr, &client_len);
    if (bytes_recv < 0) {
      if (!g_running)
        break;
      if (errno == EAGAIN || errno == EWOULDBLOCK)
        continue; /* Venció la espera sin consultas */
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
  if (use_api)
    curl_global_cleanup();
  return EXIT_SUCCESS;
}
