#include "geo.h"

#include <arpa/inet.h>
#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
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

/* Elimina espacios en blanco iniciales y finales de una cadena */
static char *trim_whitespace(char *str) {
  if (!str) return NULL;
  while (isspace((unsigned char)*str)) str++;
  if (*str == 0) return str;
  char *end = str + strlen(str) - 1;
  while (end > str && isspace((unsigned char)*end)) end--;
  end[1] = '\0';
  return str;
}

int geo_load_from_csv(const char *filepath) {
  if (!filepath) return -1;

  FILE *f = fopen(filepath, "r");
  if (!f) {
    return -1;
  }

  char line[512];
  int count = 0;

  while (fgets(line, sizeof(line), f)) {
    char *trimmed = trim_whitespace(line);
    /* Ignora líneas vacías o de comentarios */
    if (*trimmed == '\0' || *trimmed == '#') {
      continue;
    }

    char *start_ip = strtok(trimmed, ",\t");
    char *end_ip = strtok(NULL, ",\t");
    char *country_code = strtok(NULL, ",\t");

    if (start_ip && end_ip && country_code) {
      start_ip = trim_whitespace(start_ip);
      end_ip = trim_whitespace(end_ip);
      country_code = trim_whitespace(country_code);

      if (strlen(start_ip) > 0 && strlen(end_ip) > 0 && strlen(country_code) > 0) {
        geo_add_range(start_ip, end_ip, country_code);
        count++;
      }
    }
  }

  fclose(f);
  return count;
}

static void geo_load_fallback_defaults(void) {
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

void geo_init(void) {
  g_range_count = 0;

  const char *geo_path = getenv("GEO_DB_PATH");
  if (!geo_path) {
    geo_path = getenv("IP_TO_COUNTRY_PATH");
  }

  if (geo_path && strlen(geo_path) > 0) {
    int loaded = geo_load_from_csv(geo_path);
    if (loaded > 0) {
      printf("[GEO] Cargados %d rangos IP-to-Country desde %s\n", loaded, geo_path);
      return;
    }
    fprintf(stderr, "[GEO][WARN] No se pudo cargar el archivo '%s'. Probando rutas por defecto...\n", geo_path);
  }

  /* Intenta rutas por defecto relativas comunes */
  const char *default_paths[] = {
      "/app/config/ip_to_country.csv",
      "config/ip_to_country.csv",
      "../config/ip_to_country.csv",
      NULL
  };

  for (int i = 0; default_paths[i]; i++) {
    int loaded = geo_load_from_csv(default_paths[i]);
    if (loaded > 0) {
      printf("[GEO] Cargados %d rangos IP-to-Country desde ruta por defecto '%s'\n", loaded, default_paths[i]);
      return;
    }
  }

  fprintf(stderr, "[GEO][INFO] Usando rangos sembrados por defecto en memoria.\n");
  geo_load_fallback_defaults();
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
