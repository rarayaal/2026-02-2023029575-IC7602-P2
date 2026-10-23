#include "geo.h"

#include <arpa/inet.h>
#include <stdio.h>
#include <string.h>

static ip_range_t g_ranges[GEO_MAX_RANGES];
static size_t g_range_count = 0;

/* Convierte una dirección IP en notación decimal con puntos a entero de 32 bits
 * en host order */
static uint32_t ip_to_uint(const char *ip_str) {
  struct in_addr addr;
  if (inet_pton(AF_INET, ip_str, &addr) <= 0) {
    return 0;
  }
  return ntohl(addr.s_addr);
}

void geo_add_range(const char *start_ip, const char *end_ip,
                   const char *country_code) {
  if (!start_ip || !end_ip || !country_code ||
      g_range_count >= GEO_MAX_RANGES) {
    return;
  }

  uint32_t start = ip_to_uint(start_ip);
  uint32_t end = ip_to_uint(end_ip);

  if (start == 0 || end == 0 || start > end) {
    return;
  }

  ip_range_t *entry = &g_ranges[g_range_count++];
  entry->ip_start = start;
  entry->ip_end = end;
  strncpy(entry->country_code, country_code, sizeof(entry->country_code) - 1);
  entry->country_code[sizeof(entry->country_code) - 1] = '\0';
}

void geo_init(void) {
  g_range_count = 0;

  /* Rangos sembrados de la base de datos IP-to-Country de P1 */
  /* Costa Rica (CR) */
  geo_add_range("190.113.0.0", "190.113.255.255", "CR");
  geo_add_range("196.40.0.0", "196.40.255.255", "CR");
  geo_add_range("201.191.0.0", "201.191.255.255", "CR");

  /* Estados Unidos (US) */
  geo_add_range("8.8.8.0", "8.8.8.255", "US");
  geo_add_range("12.0.0.0", "12.255.255.255", "US");
  geo_add_range("104.16.0.0", "104.31.255.255", "US");
  geo_add_range("198.51.100.0", "198.51.100.255", "US");

  /* España (ES) */
  geo_add_range("80.58.0.0", "80.58.255.255", "ES");
  geo_add_range("88.0.0.0", "88.31.255.255", "ES");

  /* Alemania (DE) */
  geo_add_range("85.214.0.0", "85.214.255.255", "DE");
  geo_add_range("194.95.0.0", "194.95.255.255", "DE");

  /* Japón (JP) */
  geo_add_range("133.0.0.0", "133.255.255.255", "JP");

  /* Brasil (BR) */
  geo_add_range("177.0.0.0", "177.255.255.255", "BR");

  /* México (MX) */
  geo_add_range("187.130.0.0", "187.255.255.255", "MX");
  geo_add_range("200.68.128.0", "200.68.255.255", "MX");

  /* Australia (AU) */
  geo_add_range("1.1.1.0", "1.1.1.255", "AU");
}

const char *geo_lookup_country(const char *ip_str) {
  if (!ip_str) {
    return NULL;
  }

  uint32_t ip = ip_to_uint(ip_str);
  if (ip == 0) {
    return NULL;
  }

  for (size_t i = 0; i < g_range_count; i++) {
    if (ip >= g_ranges[i].ip_start && ip <= g_ranges[i].ip_end) {
      return g_ranges[i].country_code;
    }
  }

  return NULL;
}
