#include "config_client.h"
#include "http_util.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <curl/curl.h>

typedef struct {
    char *data;
    size_t size;
    size_t capacity;
} Buffer;

static size_t write_cb(void *contents, size_t size, size_t nmemb, void *userp) {
    size_t total = size * nmemb;
    Buffer *buf = (Buffer *)userp;
    if (buf->size + total >= buf->capacity) {
        size_t new_cap = buf->capacity + total + 2048;
        char *ptr = realloc(buf->data, new_cap);
        if (!ptr) return 0;
        buf->data = ptr;
        buf->capacity = new_cap;
    }
    memcpy(&(buf->data[buf->size]), contents, total);
    buf->size += total;
    buf->data[buf->size] = 0;
    return total;
}

const DomainURLConfig *find_matching_url_config(const DomainConfig *config, const char *path) {
    if (!config || !path) return NULL;
    for (int i = 0; i < config->url_count; i++) {
        if (match_url_pattern(config->urls[i].pattern, path)) {
            return &config->urls[i];
        }
    }
    return NULL;
}

// Extrae un string simple tipo "host":"abc" o "scheme":"http" del JSON
static int parse_json_string(const char *json, const char *key, char *out, size_t out_len) {
    if (!json || !key || !out || out_len == 0) return 0;
    out[0] = 0;
    char needle[64];
    snprintf(needle, sizeof(needle), "\"%s\"", key);
    const char *pos = strstr(json, needle);
    if (!pos) return 0;
    pos += strlen(needle);
    while (*pos == ' ' || *pos == ':') pos++;
    if (*pos == '\"') {
        pos++;
        size_t i = 0;
        while (*pos != '\"' && *pos != '\0' && i < out_len - 1) {
            out[i++] = *pos++;
        }
        out[i] = 0;
        return 1;
    }
    return 0;
}

// Extrae un número entero tipo "port":8080 del JSON
static int parse_json_int(const char *json, const char *key, int *out) {
    if (!json || !key || !out) return 0;
    char needle[64];
    snprintf(needle, sizeof(needle), "\"%s\"", key);
    const char *pos = strstr(json, needle);
    if (!pos) return 0;
    pos += strlen(needle);
    while (*pos == ' ' || *pos == ':') pos++;
    *out = atoi(pos);
    return 1;
}

// Extrae un tamaño (size_t) tipo "cacheSizeBytes":10485760 del JSON
static int parse_json_size_t(const char *json, const char *key, size_t *out) {
    if (!json || !key || !out) return 0;
    char needle[64];
    snprintf(needle, sizeof(needle), "\"%s\"", key);
    const char *pos = strstr(json, needle);
    if (!pos) return 0;
    pos += strlen(needle);
    while (*pos == ' ' || *pos == ':') pos++;
    *out = (size_t)strtoull(pos, NULL, 10);
    return 1;
}

// Parsea el arreglo "urls" del JSON retornado por el API
static void parse_urls_array(const char *json, DomainConfig *config_out) {
    const char *urls_start = strstr(json, "\"urls\"");
    if (!urls_start) return;

    urls_start = strchr(urls_start, '[');
    if (!urls_start) return;

    const char *curr = urls_start + 1;
    config_out->url_count = 0;

    while (*curr && *curr != ']' && config_out->url_count < MAX_CONFIG_URLS) {
        const char *obj_start = strchr(curr, '{');
        if (!obj_start) break;

        // Avanzar balanceando llaves para delimitar el objeto de la URL completo
        int depth = 0;
        const char *p = obj_start;
        const char *obj_end = NULL;
        while (*p && (*p != ']' || depth > 0)) {
            if (*p == '{') depth++;
            else if (*p == '}') {
                depth--;
                if (depth == 0) {
                    obj_end = p;
                    break;
                }
            }
            p++;
        }
        if (!obj_end) break;

        size_t block_len = (size_t)(obj_end - obj_start + 1);
        char *block = malloc(block_len + 1);
        if (!block) break;
        memcpy(block, obj_start, block_len);
        block[block_len] = '\0';

        DomainURLConfig *url_cfg = &config_out->urls[config_out->url_count];
        memset(url_cfg, 0, sizeof(DomainURLConfig));

        parse_json_string(block, "id", url_cfg->id, sizeof(url_cfg->id));
        parse_json_string(block, "pattern", url_cfg->pattern, sizeof(url_cfg->pattern));
        parse_json_size_t(block, "cacheSizeBytes", &url_cfg->cache_size_bytes);

        // Extraer tipo de autenticación: "auth":{"type":"api_key"} o "none"
        const char *auth_pos = strstr(block, "\"auth\"");
        if (auth_pos) {
            parse_json_string(auth_pos, "type", url_cfg->auth_type, sizeof(url_cfg->auth_type));
        }
        if (strlen(url_cfg->auth_type) == 0) {
            strncpy(url_cfg->auth_type, "none", sizeof(url_cfg->auth_type) - 1);
        }

        // Parsear reglas de fileTypes
        const char *ft_start = strstr(block, "\"fileTypes\"");
        if (ft_start) {
            const char *arr = strchr(ft_start, '[');
            if (arr) {
                const char *fcurr = arr + 1;
                while (*fcurr && *fcurr != ']' && url_cfg->file_type_count < MAX_FILE_TYPES) {
                    const char *f_obj = strchr(fcurr, '{');
                    if (!f_obj || f_obj > strchr(arr, ']')) break;
                    const char *f_end = strchr(f_obj, '}');
                    if (!f_end) break;

                    size_t flen = (size_t)(f_end - f_obj + 1);
                    char *fblock = malloc(flen + 1);
                    if (fblock) {
                        memcpy(fblock, f_obj, flen);
                        fblock[flen] = '\0';

                        DomainFileTypeRule *rule = &url_cfg->file_types[url_cfg->file_type_count];
                        parse_json_string(fblock, "extension", rule->extension, sizeof(rule->extension));
                        parse_json_int(fblock, "ttlSeconds", &rule->ttl_seconds);
                        parse_json_string(fblock, "policy", rule->policy, sizeof(rule->policy));

                        url_cfg->file_type_count++;
                        free(fblock);
                    }
                    fcurr = f_end + 1;
                }
            }
        }

        // Si no trajo fileTypes específicos, regla comodín por defecto
        if (url_cfg->file_type_count == 0) {
            url_cfg->file_type_count = 1;
            strncpy(url_cfg->file_types[0].extension, "*", sizeof(url_cfg->file_types[0].extension) - 1);
            url_cfg->file_types[0].ttl_seconds = 300;
            strncpy(url_cfg->file_types[0].policy, "LRU", sizeof(url_cfg->file_types[0].policy) - 1);
        }

        config_out->url_count++;
        free(block);
        curr = obj_end + 1;
    }
}

int fetch_domain_config(const char *domain, DomainConfig *config_out) {
    if (!config_out) return -1;
    memset(config_out, 0, sizeof(DomainConfig));

    const char *eff_domain = (domain && strlen(domain) > 0) ? domain : "default";
    strncpy(config_out->domain, eff_domain, sizeof(config_out->domain) - 1);

    // Intentar consultar al REST API si está configurado (T-11 y T-31)
    const char *api_url = getenv("CONFIG_API_URL");
    const char *api_token = getenv("CONFIG_API_TOKEN");

    if (api_url && strlen(api_url) > 0 && api_token && strlen(api_token) > 0) {
        CURL *curl = curl_easy_init();
        if (curl) {
            char url[512];
            snprintf(url, sizeof(url), "%s/api/internal/domains/%s/config", api_url, eff_domain);

            struct curl_slist *headers = NULL;
            char auth_header[256];
            snprintf(auth_header, sizeof(auth_header), "Authorization: Bearer %s", api_token);
            headers = curl_slist_append(headers, auth_header);

            Buffer buf = { .data = malloc(4096), .size = 0, .capacity = 4096 };
            if (buf.data) {
                buf.data[0] = 0;
                curl_easy_setopt(curl, CURLOPT_URL, url);
                curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
                curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_cb);
                curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&buf);
                curl_easy_setopt(curl, CURLOPT_TIMEOUT, 3L);

                CURLcode res = curl_easy_perform(curl);
                long http_code = 0;
                curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);

                if (res == CURLE_OK && http_code == 200 && buf.size > 0) {
                    // Parsear configuración básica del JSON retornado
                    char scheme[16] = {0};
                    char host[128] = {0};
                    int port = 80;
                    parse_json_string(buf.data, "scheme", scheme, sizeof(scheme));
                    parse_json_string(buf.data, "host", host, sizeof(host));
                    parse_json_int(buf.data, "port", &port);

                    if (strlen(host) > 0) {
                        strncpy(config_out->origin_scheme, strlen(scheme) > 0 ? scheme : "http", sizeof(config_out->origin_scheme) - 1);
                        strncpy(config_out->origin_host, host, sizeof(config_out->origin_host) - 1);
                        config_out->origin_port = port;

                        size_t cache_size = 100 * 1024 * 1024;
                        parse_json_size_t(buf.data, "cacheSizeBytes", &cache_size);
                        config_out->cache_size_bytes = cache_size;

                        // Parsear dinámicamente el arreglo de URLs
                        parse_urls_array(buf.data, config_out);

                        // Si no venía ninguna URL en el JSON, fallback a comodín por defecto
                        if (config_out->url_count == 0) {
                            config_out->url_count = 1;
                            strncpy(config_out->urls[0].id, "u1", sizeof(config_out->urls[0].id) - 1);
                            strncpy(config_out->urls[0].pattern, "/*", sizeof(config_out->urls[0].pattern) - 1);
                            strncpy(config_out->urls[0].auth_type, "none", sizeof(config_out->urls[0].auth_type) - 1);
                        }

                        free(buf.data);
                        curl_slist_free_all(headers);
                        curl_easy_cleanup(curl);
                        return 0;
                    }
                }
                free(buf.data);
            }
            curl_slist_free_all(headers);
            curl_easy_cleanup(curl);
        }
    }

    // Fallback a variables de entorno para pruebas o si el API no está disponible
    const char *env_host = getenv("ORIGIN_HOST");
    const char *env_port = getenv("ORIGIN_PORT");
    const char *env_scheme = getenv("ORIGIN_SCHEME");
    const char *env_auth_mode = getenv("AUTH_MODE");

    strncpy(config_out->origin_scheme, (env_scheme && strlen(env_scheme) > 0) ? env_scheme : "http", sizeof(config_out->origin_scheme) - 1);
    strncpy(config_out->origin_host, (env_host && strlen(env_host) > 0) ? env_host : "httpbin.org", sizeof(config_out->origin_host) - 1);
    config_out->origin_port = (env_port && strlen(env_port) > 0) ? atoi(env_port) : 80;
    config_out->cache_size_bytes = 100 * 1024 * 1024;

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

int validate_api_key_remote(const char *domain, const char *url_id, const char *api_key) {
    if (!domain || !url_id || !api_key) return 0;
    const char *api_url = getenv("CONFIG_API_URL");
    const char *api_token = getenv("CONFIG_API_TOKEN");
    if (!api_url || !api_token) return 1; // Fallback permitivo si no está configurado

    CURL *curl = curl_easy_init();
    if (!curl) return 0;

    char url[512];
    snprintf(url, sizeof(url), "%s/api/internal/validate/api-key", api_url);

    struct curl_slist *headers = NULL;
    char auth_header[256];
    snprintf(auth_header, sizeof(auth_header), "Authorization: Bearer %s", api_token);
    headers = curl_slist_append(headers, auth_header);
    headers = curl_slist_append(headers, "Content-Type: application/json");

    char post_fields[512];
    snprintf(post_fields, sizeof(post_fields),
             "{\"domain\":\"%s\",\"urlId\":\"%s\",\"apiKey\":\"%s\"}",
             domain, url_id, api_key);

    Buffer buf = { .data = malloc(1024), .size = 0, .capacity = 1024 };
    buf.data[0] = 0;

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, post_fields);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_cb);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&buf);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 3L);

    CURLcode res = curl_easy_perform(curl);
    long http_code = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);

    int is_valid = 0;
    if (res == CURLE_OK && http_code == 200 && buf.data) {
        if (strstr(buf.data, "\"valid\":true")) {
            is_valid = 1;
        }
    }

    free(buf.data);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return is_valid;
}

int validate_session_remote(const char *domain, const char *url_id, const char *session_token) {
    if (!domain || !url_id || !session_token) return 0;
    const char *api_url = getenv("CONFIG_API_URL");
    const char *api_token = getenv("CONFIG_API_TOKEN");
    if (!api_url || !api_token) return 1;

    CURL *curl = curl_easy_init();
    if (!curl) return 0;

    char url[512];
    snprintf(url, sizeof(url), "%s/api/internal/validate/session", api_url);

    struct curl_slist *headers = NULL;
    char auth_header[256];
    snprintf(auth_header, sizeof(auth_header), "Authorization: Bearer %s", api_token);
    headers = curl_slist_append(headers, auth_header);
    headers = curl_slist_append(headers, "Content-Type: application/json");

    char post_fields[512];
    snprintf(post_fields, sizeof(post_fields),
             "{\"domain\":\"%s\",\"urlId\":\"%s\",\"sessionToken\":\"%s\"}",
             domain, url_id, session_token);

    Buffer buf = { .data = malloc(1024), .size = 0, .capacity = 1024 };
    buf.data[0] = 0;

    curl_easy_setopt(curl, CURLOPT_URL, url);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, post_fields);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_cb);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&buf);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 3L);

    CURLcode res = curl_easy_perform(curl);
    long http_code = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);

    int is_valid = 0;
    if (res == CURLE_OK && http_code == 200 && buf.data) {
        if (strstr(buf.data, "\"valid\":true")) {
            is_valid = 1;
        }
    }

    free(buf.data);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return is_valid;
}
