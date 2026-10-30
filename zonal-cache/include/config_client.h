#ifndef ZONAL_CACHE_CONFIG_CLIENT_H
#define ZONAL_CACHE_CONFIG_CLIENT_H

#include <stddef.h>

#define MAX_CONFIG_URLS 16
#define MAX_FILE_TYPES 8

typedef struct {
    char extension[16];
    int ttl_seconds;
    char policy[16];
} DomainFileTypeRule;

typedef struct {
    char id[32];
    char pattern[256];
    size_t cache_size_bytes;
    char auth_type[32]; // "none", "api_key", "user_password"
    DomainFileTypeRule file_types[MAX_FILE_TYPES];
    int file_type_count;
} DomainURLConfig;

typedef struct {
    char domain[128];
    char origin_scheme[16];
    char origin_host[128];
    int origin_port;
    size_t cache_size_bytes;
    DomainURLConfig urls[MAX_CONFIG_URLS];
    int url_count;
} DomainConfig;

/* Obtiene la configuración del dominio desde CONFIG_API_URL o fallback a variables de entorno */
int fetch_domain_config(const char *domain, DomainConfig *config_out);

/* Busca la regla de URL que hace match con el path solicitado */
const DomainURLConfig *find_matching_url_config(const DomainConfig *config, const char *path);

/* Valida una API key contra el API en Node.js (POST /api/internal/validate/api-key) */
int validate_api_key_remote(const char *domain, const char *url_id, const char *api_key);

/* Valida una sesión contra el API en Node.js (POST /api/internal/validate/session) */
int validate_session_remote(const char *domain, const char *url_id, const char *session_token);

#endif

