#ifndef CONFIG_API_H
#define CONFIG_API_H

#include "domains.h"

#include <stddef.h>

/* Lista de dominios verificados obtenida del REST API en Node.js */
typedef struct {
  char names[MAX_DOMAINS][MAX_DOMAIN_LEN];
  size_t count;
} domain_list_t;

/*
 * Extrae los dominios de la respuesta de GET /api/internal/domains,
 * con la forma {"domains":["a.com","b.com"]}.
 * Devuelve 0 si el JSON tiene el arreglo esperado y -1 si no.
 */
int config_api_parse_domains(const char *json, domain_list_t *out);

/*
 * Consulta GET {api_url}/api/internal/domains con el token de servicio.
 * Devuelve 0 si la respuesta fue 200 y se pudo interpretar, y -1 si no.
 */
int config_api_fetch_domains(const char *api_url, const char *token,
                             domain_list_t *out);

#endif /* CONFIG_API_H */
