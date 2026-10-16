#include "domains.h"

#include <stdio.h>
#include <string.h>
#include <strings.h>

static registered_domain_t g_domains[MAX_DOMAINS];
static size_t g_domain_count = 0;

void domains_init(void) {
  g_domain_count = 0;
  memset(g_domains, 0, sizeof(g_domains));
}

bool domains_add(const char *domain, uint32_t ttl) {
  if (!domain || g_domain_count >= MAX_DOMAINS) {
    return false;
  }

  /* Actualiza el TTL si el dominio ya existe */
  for (size_t i = 0; i < g_domain_count; i++) {
    if (strcasecmp(g_domains[i].domain, domain) == 0) {
      g_domains[i].ttl = ttl;
      return true;
    }
  }

  registered_domain_t *entry = &g_domains[g_domain_count++];
  strncpy(entry->domain, domain, sizeof(entry->domain) - 1);
  entry->ttl = ttl;
  entry->zonal_count = 0;
  return true;
}

bool domains_add_zonal_cache(const char *domain, const char *country_code,
                             const char *cache_ip) {
  if (!domain || !country_code || !cache_ip)
    return false;

  for (size_t i = 0; i < g_domain_count; i++) {
    if (strcasecmp(g_domains[i].domain, domain) == 0) {
      registered_domain_t *entry = &g_domains[i];
      if (entry->zonal_count >= MAX_ZONAL_CACHES)
        return false;

      zonal_cache_map_t *map = &entry->zonal_caches[entry->zonal_count++];
      strncpy(map->country_code, country_code, sizeof(map->country_code) - 1);
      strncpy(map->cache_ip, cache_ip, sizeof(map->cache_ip) - 1);
      return true;
    }
  }
  return false;
}

bool domains_is_registered(const char *domain, registered_domain_t *out_info) {
  if (!domain)
    return false;

  for (size_t i = 0; i < g_domain_count; i++) {
    if (strcasecmp(g_domains[i].domain, domain) == 0) {
      if (out_info) {
        *out_info = g_domains[i];
      }
      return true;
    }
  }
  return false;
}

const char *
domains_get_cache_ip_for_country(const registered_domain_t *domain_info,
                                 const char *country_code) {
  if (!domain_info || domain_info->zonal_count == 0) {
    return NULL;
  }

  /* Busca coincidencia directa por código de país */
  if (country_code && strlen(country_code) > 0) {
    for (size_t i = 0; i < domain_info->zonal_count; i++) {
      if (strcasecmp(domain_info->zonal_caches[i].country_code, country_code) ==
          0) {
        return domain_info->zonal_caches[i].cache_ip;
      }
    }
  }

  /* Busca la caché zonal por defecto */
  for (size_t i = 0; i < domain_info->zonal_count; i++) {
    if (strcasecmp(domain_info->zonal_caches[i].country_code, "DEFAULT") == 0) {
      return domain_info->zonal_caches[i].cache_ip;
    }
  }

  /* Retorna la primera caché configurada como respaldo */
  return domain_info->zonal_caches[0].cache_ip;
}
