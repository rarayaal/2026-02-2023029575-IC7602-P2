#ifndef DOMAINS_H
#define DOMAINS_H

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#define MAX_DOMAINS 64
#define MAX_DOMAIN_LEN 256
#define MAX_ZONAL_CACHES 16
#define IP_STR_LEN 16
#define COUNTRY_CODE_LEN 4

/* Mapea zona o país hacia la IP de la Caché Zonal */
typedef struct {
  char country_code[COUNTRY_CODE_LEN];
  char cache_ip[IP_STR_LEN];
} zonal_cache_map_t;

/* Representa un dominio administrado */
typedef struct {
  char domain[MAX_DOMAIN_LEN];
  uint32_t ttl;
  zonal_cache_map_t zonal_caches[MAX_ZONAL_CACHES];
  size_t zonal_count;
} registered_domain_t;

/* Inicializa la tabla de dominios */
void domains_init(void);

/* Registra un dominio para interceptación */
bool domains_add(const char *domain, uint32_t ttl);

/* Asocia una caché zonal a un dominio */
bool domains_add_zonal_cache(const char *domain, const char *country_code,
                             const char *cache_ip);

/* Comprueba si el dominio se encuentra registrado */
bool domains_is_registered(const char *domain, registered_domain_t *out_info);

/* Obtiene la IP de la caché zonal según el país del cliente */
const char *
domains_get_cache_ip_for_country(const registered_domain_t *domain_info,
                                 const char *country_code);

#endif /* DOMAINS_H */
