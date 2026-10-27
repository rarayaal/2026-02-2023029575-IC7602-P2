#include "config_client.h"
#include "http_util.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

const DomainURLConfig *find_matching_url_config(const DomainConfig *config, const char *path) {
    if (!config || !path) return NULL;
    for (int i = 0; i < config->url_count; i++) {
        if (match_url_pattern(config->urls[i].pattern, path)) {
            return &config->urls[i];
        }
    }
    return NULL;
}

int fetch_domain_config(const char *domain, DomainConfig *config_out) {
    if (!config_out) return -1;
    memset(config_out, 0, sizeof(DomainConfig));

    if (domain && strlen(domain) > 0) {
        strncpy(config_out->domain, domain, sizeof(config_out->domain) - 1);
    } else {
        strncpy(config_out->domain, "default", sizeof(config_out->domain) - 1);
    }

    // Configuración base de origen (leyendo variables de entorno o defaults)
    const char *env_host = getenv("ORIGIN_HOST");
    const char *env_port = getenv("ORIGIN_PORT");
    const char *env_scheme = getenv("ORIGIN_SCHEME");
    const char *env_auth_mode = getenv("AUTH_MODE");

    strncpy(config_out->origin_scheme, (env_scheme && strlen(env_scheme) > 0) ? env_scheme : "http", sizeof(config_out->origin_scheme) - 1);
    strncpy(config_out->origin_host, (env_host && strlen(env_host) > 0) ? env_host : "httpbin.org", sizeof(config_out->origin_host) - 1);
    config_out->origin_port = (env_port && strlen(env_port) > 0) ? atoi(env_port) : 80;
    config_out->cache_size_bytes = 100 * 1024 * 1024; // 100 MB

    // Regla de URL por defecto: wildcard general "/*"
    config_out->url_count = 1;
    strncpy(config_out->urls[0].id, "u1", sizeof(config_out->urls[0].id) - 1);
    strncpy(config_out->urls[0].pattern, "/*", sizeof(config_out->urls[0].pattern) - 1);
    config_out->urls[0].cache_size_bytes = config_out->cache_size_bytes;
    strncpy(config_out->urls[0].auth_type, (env_auth_mode && strlen(env_auth_mode) > 0) ? env_auth_mode : "api_key", sizeof(config_out->urls[0].auth_type) - 1);

    config_out->urls[0].file_type_count = 1;
    strncpy(config_out->urls[0].file_types[0].extension, "*", sizeof(config_out->urls[0].file_types[0].extension) - 1);
    config_out->urls[0].file_types[0].ttl_seconds = 300;
    strncpy(config_out->urls[0].file_types[0].policy, "LRU", sizeof(config_out->urls[0].file_types[0].policy) - 1);

    return 0;
}
