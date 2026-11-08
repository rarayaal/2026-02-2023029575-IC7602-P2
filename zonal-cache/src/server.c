#define _DEFAULT_SOURCE
#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <pthread.h>
#include <signal.h>

#define DEFAULT_PORT 8080
#define BUFFER_SIZE 8192
#define ORIGIN_MAX_RESPONSE_SIZE (512 * 1024)

static volatile int server_running = 1;
static int server_socket_fd = -1;

void handle_signal(int sig) {
    (void)sig;
    server_running = 0;
    if (server_socket_fd >= 0) {
        close(server_socket_fd);
        server_socket_fd = -1;
    }
}

#include "http_util.h"
#include "cache.h"
#include "config_client.h"

static cache_index_t *global_cache_index = NULL;
static cache_storage_t *global_cache_storage = NULL;
static pthread_mutex_t cache_mutex = PTHREAD_MUTEX_INITIALIZER;

static cache_policy_t parse_cache_policy(const char *str) {
    if (!str) return CACHE_POLICY_LRU;
    if (strcasecmp(str, "MRU") == 0) return CACHE_POLICY_MRU;
    if (strcasecmp(str, "LFU") == 0) return CACHE_POLICY_LFU;
    if (strcasecmp(str, "FIFO") == 0) return CACHE_POLICY_FIFO;
    if (strcasecmp(str, "RANDOM") == 0) return CACHE_POLICY_RANDOM;
    return CACHE_POLICY_LRU;
}

static void extract_file_extension(const char *path, char *ext_out, size_t max_len) {
    if (!path || !ext_out || max_len == 0) {
        if (ext_out && max_len > 0) ext_out[0] = '\0';
        return;
    }
    ext_out[0] = '\0';
    const char *q = strchr(path, '?');
    size_t path_len = q ? (size_t)(q - path) : strlen(path);

    const char *last_dot = NULL;
    for (size_t i = 0; i < path_len; i++) {
        if (path[i] == '/') last_dot = NULL;
        else if (path[i] == '.') last_dot = &path[i];
    }

    if (last_dot && last_dot + 1 < path + path_len) {
        size_t elen = (size_t)((path + path_len) - (last_dot + 1));
        if (elen >= max_len) elen = max_len - 1;
        strncpy(ext_out, last_dot + 1, elen);
        ext_out[elen] = '\0';
    } else {
        strncpy(ext_out, "*", max_len - 1);
        ext_out[max_len - 1] = '\0';
    }
}

static const char *get_default_origin_host(void) {
    const char *env = getenv("ORIGIN_HOST");
    return (env && strlen(env) > 0) ? env : "httpbin.org";
}

static int get_default_origin_port(void) {
    const char *env = getenv("ORIGIN_PORT");
    if (env && strlen(env) > 0) {
        int p = atoi(env);
        if (p > 0 && p <= 65535) return p;
    }
    return 80;
}

#include <curl/curl.h>

typedef struct {
    char *data;
    size_t size;
    size_t capacity;
} CurlMemoryBuffer;

static size_t server_curl_write_cb(void *contents, size_t size, size_t nmemb, void *userp) {
    size_t real_size = size * nmemb;
    CurlMemoryBuffer *mem = (CurlMemoryBuffer *)userp;

    if (mem->size + real_size >= mem->capacity) {
        size_t new_cap = mem->capacity + real_size + 4096;
        char *ptr = realloc(mem->data, new_cap);
        if (!ptr) return 0;
        mem->data = ptr;
        mem->capacity = new_cap;
    }

    memcpy(&(mem->data[mem->size]), contents, real_size);
    mem->size += real_size;
    mem->data[mem->size] = 0;
    return real_size;
}

// Función para solicitar un recurso al servidor de origen (T-12) con soporte HTTP y HTTPS
int fetch_from_origin(const char *scheme, const char *host, int origin_port, const char *path, char *response_buffer, size_t max_len) {
    if (scheme && strcasecmp(scheme, "https") == 0) {
        CURL *curl = curl_easy_init();
        if (!curl) return -1;

        char url[1024];
        if (origin_port == 443 || origin_port <= 0) {
            snprintf(url, sizeof(url), "https://%s%s", host, path);
        } else {
            snprintf(url, sizeof(url), "https://%s:%d%s", host, origin_port, path);
        }

        CurlMemoryBuffer header_buf = { .data = malloc(4096), .size = 0, .capacity = 4096 };
        CurlMemoryBuffer body_buf = { .data = malloc(8192), .size = 0, .capacity = 8192 };
        if (!header_buf.data || !body_buf.data) {
            free(header_buf.data);
            free(body_buf.data);
            curl_easy_cleanup(curl);
            return -1;
        }
        header_buf.data[0] = 0;
        body_buf.data[0] = 0;

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, server_curl_write_cb);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&body_buf);
        curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, server_curl_write_cb);
        curl_easy_setopt(curl, CURLOPT_HEADERDATA, (void *)&header_buf);

        curl_easy_setopt(curl, CURLOPT_USERAGENT, "ZonalCache/1.0");
        curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);

        CURLcode res = curl_easy_perform(curl);
        int total = -1;
        if (res == CURLE_OK) {
            size_t combined = header_buf.size + body_buf.size;
            if (combined >= max_len) {
                combined = max_len - 1;
            }
            if (header_buf.size < combined) {
                memcpy(response_buffer, header_buf.data, header_buf.size);
                memcpy(response_buffer + header_buf.size, body_buf.data, combined - header_buf.size);
            } else {
                memcpy(response_buffer, header_buf.data, combined);
            }
            response_buffer[combined] = '\0';
            total = (int)combined;
        }

        free(header_buf.data);
        free(body_buf.data);
        curl_easy_cleanup(curl);
        return total;
    }

    // Modo HTTP plano vía TCP socket directo
    int origin_fd;
    struct sockaddr_in origin_addr;
    struct hostent *server;

    origin_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (origin_fd < 0) return -1;

    server = gethostbyname(host);
    if (server == NULL) {
        close(origin_fd);
        return -1;
    }

    memset(&origin_addr, 0, sizeof(origin_addr));
    origin_addr.sin_family = AF_INET;
    memcpy(&origin_addr.sin_addr.s_addr, server->h_addr_list[0], server->h_length);
    origin_addr.sin_port = htons(origin_port > 0 ? origin_port : 80);

    if (connect(origin_fd, (struct sockaddr *)&origin_addr, sizeof(origin_addr)) < 0) {
        close(origin_fd);
        return -1;
    }

    // Armar la petición HTTP al origen
    char request[BUFFER_SIZE];
    snprintf(request, sizeof(request),
             "GET %s HTTP/1.1\r\n"
             "Host: %s\r\n"
             "User-Agent: ZonalCache/1.0\r\n"
             "Connection: close\r\n\r\n", path, host);

    write(origin_fd, request, strlen(request));

    // Leer respuesta del origen
    ssize_t total_bytes = 0;
    ssize_t bytes = 0;
    while ((bytes = read(origin_fd, response_buffer + total_bytes, max_len - total_bytes - 1)) > 0) {
        total_bytes += bytes;
    }
    response_buffer[total_bytes] = '\0';

    close(origin_fd);
    return total_bytes;
}


static const char *get_auth_ui_url(void) {
    const char *env = getenv("AUTH_UI_URL");
    return (env && strlen(env) > 0) ? env : "http://localhost:5173/login";
}

// Extrae el valor de un query param simple de una query string (ej: ?token=abc&redirect=/panel)
int extract_query_param(const char *query, const char *param_name, char *out, size_t out_len) {
    if (!query || !param_name || !out || out_len == 0) return 0;
    out[0] = '\0';

    char needle[64];
    snprintf(needle, sizeof(needle), "%s=", param_name);
    const char *start = strstr(query, needle);
    if (!start) return 0;

    start += strlen(needle);
    size_t i = 0;
    while (*start != '&' && *start != ' ' && *start != '\r' && *start != '\n' && *start != '\0' && i < out_len - 1) {
        out[i++] = *start++;
    }
    out[i] = '\0';
    return 1;
}

// Valida si la sesión es válida (T-15)
int is_valid_session(const char *domain, const char *url_id, const char *session_token) {
    if (!session_token || strlen(session_token) == 0) return 0;

    // 1. Para pruebas locales o integración aislada, validar contra EXPECTED_SESSION_TOKEN si existe
    const char *expected_token = getenv("EXPECTED_SESSION_TOKEN");
    if (expected_token && strlen(expected_token) > 0) {
        return (strcmp(session_token, expected_token) == 0);
    }

    // 2. Si está configurado el API remoto, validar contra los endpoints internos de Node.js/Firestore
    const char *api_url = getenv("CONFIG_API_URL");
    if (api_url && strlen(api_url) > 0) {
        int remote_res = validate_session_remote(domain, url_id, session_token);
        return (remote_res > 0) ? 1 : 0;
    }

    // 3. Si no hay API remota ni token local esperado configurado, rechazar por seguridad
    return 0;
}

// Valida si la API Key es válida (T-13)
int is_valid_api_key(const char *domain, const char *url_id, const char *api_key) {
    if (!api_key || strlen(api_key) == 0) return 0;

    // 1. Para pruebas locales o integración aislada, validar contra EXPECTED_API_KEY si existe
    const char *expected_key = getenv("EXPECTED_API_KEY");
    if (expected_key && strlen(expected_key) > 0) {
        return (strcmp(api_key, expected_key) == 0);
    }

    // 2. Si está configurado el API remoto, validar contra los endpoints internos de Node.js/Firestore
    const char *api_url = getenv("CONFIG_API_URL");
    if (api_url && strlen(api_url) > 0) {
        int remote_res = validate_api_key_remote(domain, url_id, api_key);
        return (remote_res > 0) ? 1 : 0;
    }

    // 3. Si no hay API remota ni clave local esperada configurada, rechazar por seguridad
    return 0;
}


void *handle_client(void *client_socket_ptr) {
    int client_fd = *(int *)client_socket_ptr;
    free(client_socket_ptr);
    char buffer[BUFFER_SIZE] = {0};

    ssize_t bytes_read = read(client_fd, buffer, BUFFER_SIZE - 1);
    if (bytes_read > 0) {
        HTTPRequest req;
        parse_http_request(buffer, &req);

        const char *effective_domain = strlen(req.host) > 0 ? req.host : "default";

        printf("\n[Petición Recibida]\n");
        printf(" -> Dominio: %s\n", effective_domain);
        printf(" -> Método:  %s\n", req.method);
        printf(" -> Path:    %s\n", req.path);
        printf(" -> APIKey:  %s\n", strlen(req.api_key) > 0 ? req.api_key : "(Ninguna)");
        printf(" -> Sesión:  %s\n", strlen(req.cookie_session) > 0 ? req.cookie_session : "(Ninguna)");

        // 1. Manejo de ruta reservada /__zc/session (T-14 y T-15)
        if (strncmp(req.path, "/__zc/session", 13) == 0) {
            char token[128] = {0};
            char redirect[256] = {0};
            char query_url_id[64] = {0};
            const char *query = strchr(req.path, '?');

            if (query) {
                extract_query_param(query + 1, "token", token, sizeof(token));
                extract_query_param(query + 1, "redirect", redirect, sizeof(redirect));
                extract_query_param(query + 1, "urlId", query_url_id, sizeof(query_url_id));
            }

            // Sanitizar redirección: solo aceptar rutas relativas seguras
            if (redirect[0] != '/' || (redirect[0] == '/' && redirect[1] == '/')) {
                snprintf(redirect, sizeof(redirect), "/");
            }

            // Resolver urlId real: buscar qué regla de URL coincide con redirect
            DomainConfig sess_domain_cfg;
            fetch_domain_config(effective_domain, &sess_domain_cfg);
            const DomainURLConfig *matched_sess_url = find_matching_url_config(&sess_domain_cfg, redirect);

            const char *effective_url_id = "u1";
            if (strlen(query_url_id) > 0) {
                effective_url_id = query_url_id;
            } else if (matched_sess_url && strlen(matched_sess_url->id) > 0) {
                effective_url_id = matched_sess_url->id;
            } else if (sess_domain_cfg.url_count > 0 && strlen(sess_domain_cfg.urls[0].id) > 0) {
                effective_url_id = sess_domain_cfg.urls[0].id;
            }

            if (strlen(token) > 0 && is_valid_session(effective_domain, effective_url_id, token)) {
                char response[BUFFER_SIZE];
                snprintf(response, sizeof(response),
                         "HTTP/1.1 302 Found\r\n"
                         "Location: %s\r\n"
                         "Set-Cookie: zc_session=%s; HttpOnly; Path=/\r\n"
                         "Content-Length: 0\r\n"
                         "Connection: close\r\n\r\n",
                         redirect, token);
                write(client_fd, response, strlen(response));
                printf(" -> [T-15] Sesión establecida exitosamente vía /__zc/session (urlId: %s), redirigiendo a %s\n", effective_url_id, redirect);
            } else {
                const char *bad_request = 
                    "HTTP/1.1 400 Bad Request\r\n"
                    "Content-Type: text/plain\r\n"
                    "Content-Length: 26\r\n"
                    "Connection: close\r\n\r\n"
                    "Error: Token no valido\n";
                write(client_fd, bad_request, strlen(bad_request));
            }

            close(client_fd);
            return NULL;
        }

        // 2. Obtener configuración del dominio y URL matching (T-10 y T-11)
        DomainConfig domain_cfg;
        fetch_domain_config(effective_domain, &domain_cfg);
        const DomainURLConfig *matched_url = find_matching_url_config(&domain_cfg, req.path);

        const char *auth_mode = "none";
        const char *url_id = "u1";
        if (matched_url) {
            auth_mode = matched_url->auth_type;
            url_id = matched_url->id;
        }

        if (strcmp(auth_mode, "api_key") == 0) {
            // Validación por x-api-key (T-13)
            if (!is_valid_api_key(effective_domain, url_id, req.api_key)) {
                const char *unauthorized = 
                    "HTTP/1.1 401 Unauthorized\r\n"
                    "Content-Type: text/plain\r\n"
                    "Content-Length: 38\r\n"
                    "Connection: close\r\n\r\n"
                    "Error: x-api-key requerida o invalida\n";
                write(client_fd, unauthorized, strlen(unauthorized));
                close(client_fd);
                return NULL;
            }
        } else if (strcmp(auth_mode, "user_password") == 0) {
            // Validación por sesión / redirección a UI (T-14 y T-15)
            if (strlen(req.cookie_session) == 0 || !is_valid_session(effective_domain, url_id, req.cookie_session)) {
                const char *auth_ui = get_auth_ui_url();
                char redirect_resp[BUFFER_SIZE];
                snprintf(redirect_resp, sizeof(redirect_resp),
                         "HTTP/1.1 302 Found\r\n"
                         "Location: %s?domain=%s&urlId=%s&redirect=http://%s%s\r\n"
                         "Content-Length: 0\r\n"
                         "Connection: close\r\n\r\n",
                         auth_ui, effective_domain, url_id, effective_domain, req.path);
                write(client_fd, redirect_resp, strlen(redirect_resp));
                printf(" -> [T-14] Sin sesión activa. Redirigiendo a formulario UI de login: %s\n", auth_ui);
                close(client_fd);
                return NULL;
            }
            printf(" -> [T-15] Sesión verificada correctamente: %s\n", req.cookie_session);
        }

        // 3. Comprobar si el recurso solicitado se encuentra en caché (T-12)
        void *cached_data = NULL;
        size_t cached_size = 0;
        cache_entry_data_t entry_out;
        cache_result_t get_res = CACHE_NOT_FOUND;

        pthread_mutex_lock(&cache_mutex);
        if (global_cache_index && global_cache_storage) {
            get_res = cache_store_get(global_cache_index, global_cache_storage,
                                      effective_domain, req.path,
                                      &entry_out, &cached_data, &cached_size);
        }
        pthread_mutex_unlock(&cache_mutex);

        if (get_res == CACHE_OK && cached_data != NULL) {
            // CACHE HIT (T-12)
            printf(" -> [CACHE HIT] Sirviendo recurso desde caché (%zu bytes)\n", cached_size);
            write(client_fd, cached_data, cached_size);
            free(cached_data);
        } else {
            // CACHE MISS: Obtener desde el origen y almacenar en caché (T-12)
            const char *origin_host = strlen(domain_cfg.origin_host) > 0 ? domain_cfg.origin_host : get_default_origin_host();
            int origin_port = domain_cfg.origin_port > 0 ? domain_cfg.origin_port : get_default_origin_port();
            const char *origin_scheme = strlen(domain_cfg.origin_scheme) > 0 ? domain_cfg.origin_scheme : "http";

            printf(" -> [CACHE MISS] Obteniendo desde el origen (%s://%s:%d)...\n", origin_scheme, origin_host, origin_port);
            char *origin_response = malloc(ORIGIN_MAX_RESPONSE_SIZE);
            if (!origin_response) {
                const char *error_500 = "HTTP/1.1 500 Internal Server Error\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
                write(client_fd, error_500, strlen(error_500));
                close(client_fd);
                return NULL;
            }

            int bytes_from_origin = fetch_from_origin(origin_scheme, origin_host, origin_port, req.path, origin_response, ORIGIN_MAX_RESPONSE_SIZE);

            if (bytes_from_origin > 0) {
                // Servir respuesta al cliente
                write(client_fd, origin_response, bytes_from_origin);

                // Determinar extensión, TTL y política de reemplazo según config (T-04, T-05, T-06, T-07, T-12)
                char file_ext[16] = "*";
                extract_file_extension(req.path, file_ext, sizeof(file_ext));

                int ttl_sec = 300;
                cache_policy_t policy = CACHE_POLICY_LRU;

                if (matched_url) {
                    int found_rule = 0;
                    for (int i = 0; i < matched_url->file_type_count; i++) {
                        if (strcasecmp(matched_url->file_types[i].extension, file_ext) == 0) {
                            ttl_sec = matched_url->file_types[i].ttl_seconds;
                            policy = parse_cache_policy(matched_url->file_types[i].policy);
                            found_rule = 1;
                            break;
                        }
                    }
                    if (!found_rule) {
                        for (int i = 0; i < matched_url->file_type_count; i++) {
                            if (strcmp(matched_url->file_types[i].extension, "*") == 0) {
                                ttl_sec = matched_url->file_types[i].ttl_seconds;
                                policy = parse_cache_policy(matched_url->file_types[i].policy);
                                break;
                            }
                        }
                    }
                }

                time_t now = time(NULL);
                cache_entry_data_t new_entry = {
                    .domain = effective_domain,
                    .url = req.path,
                    .file_path = NULL,
                    .file_type = file_ext,
                    .size_bytes = (size_t)bytes_from_origin,
                    .created_at = now,
                    .expires_at = now + ttl_sec,
                    .last_accessed_at = now,
                    .access_count = 1,
                    .insertion_order = 0
                };

                cache_domain_config_t dom_cfg = {
                    .max_size_bytes = domain_cfg.cache_size_bytes > 0 ? domain_cfg.cache_size_bytes : (100 * 1024 * 1024),
                    .policy = policy
                };

                pthread_mutex_lock(&cache_mutex);
                if (global_cache_index && global_cache_storage) {
                    cache_store_put_configured(global_cache_index, global_cache_storage,
                                               &new_entry, origin_response, (size_t)bytes_from_origin,
                                               &dom_cfg);
                }
                pthread_mutex_unlock(&cache_mutex);
                printf(" -> [CACHE STORED] Recurso almacenado (ext: %s, TTL: %ds, Política: %d)\n", file_ext, ttl_sec, policy);
            } else {
                const char *error_502 = 
                    "HTTP/1.1 502 Bad Gateway\r\n"
                    "Content-Type: text/plain\r\n"
                    "Content-Length: 29\r\n"
                    "Connection: close\r\n\r\n"
                    "Error al conectar al origen\n";
                write(client_fd, error_502, strlen(error_502));
            }
            free(origin_response);
        }
    }

    close(client_fd);
    return NULL;
}


#ifndef TESTING_NO_MAIN
int main(void) {
    signal(SIGINT, handle_signal);
    signal(SIGTERM, handle_signal);

    int port = DEFAULT_PORT;
    const char *env_port = getenv("PORT");
    if (env_port != NULL && strlen(env_port) > 0) {
        int parsed = atoi(env_port);
        if (parsed > 0 && parsed <= 65535) {
            port = parsed;
        } else {
            fprintf(stderr, "[Advertencia] PORT '%s' invalido. Usando %d por defecto.\n", env_port, DEFAULT_PORT);
        }
    }

    struct sockaddr_in address;
    int opt = 1;
    socklen_t addrlen = sizeof(address);

    if ((server_socket_fd = socket(AF_INET, SOCK_STREAM, 0)) < 0) {
        perror("Socket falló");
        exit(EXIT_FAILURE);
    }

    setsockopt(server_socket_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(port);

    if (bind(server_socket_fd, (struct sockaddr *)&address, sizeof(address)) < 0) {
        perror("Bind falló");
        close(server_socket_fd);
        exit(EXIT_FAILURE);
    }

    if (listen(server_socket_fd, 128) < 0) {
        perror("Listen falló");
        close(server_socket_fd);
        exit(EXIT_FAILURE);
    }

    const char *cache_dir = getenv("CACHE_DIR");
    if (!cache_dir || strlen(cache_dir) == 0) {
        cache_dir = "/tmp/zonal-cache";
    }

    global_cache_index = cache_index_create(1024);
    global_cache_storage = cache_storage_create(cache_dir);

    printf("[Zonal Cache] Servidor HTTP listo en puerto %d (T-09, T-10, T-12, T-13)...\n", port);
    printf("[Zonal Cache] Almacenamiento en disco configurado en '%s'\n", cache_dir);

    while (server_running) {
        int *new_sock = malloc(sizeof(int));
        if (!new_sock) {
            perror("Error asignando memoria para cliente");
            continue;
        }

        *new_sock = accept(server_socket_fd, (struct sockaddr *)&address, &addrlen);
        if (*new_sock < 0) {
            free(new_sock);
            if (!server_running) break;
            perror("Accept falló");
            continue;
        }

        pthread_t thread_id;
        if (pthread_create(&thread_id, NULL, handle_client, new_sock) != 0) {
            perror("No se pudo crear el hilo");
            close(*new_sock);
            free(new_sock);
        } else {
            pthread_detach(thread_id);
        }
    }

    if (server_socket_fd >= 0) {
        close(server_socket_fd);
        server_socket_fd = -1;
    }

    pthread_mutex_lock(&cache_mutex);
    if (global_cache_index) {
        cache_index_destroy(global_cache_index);
        global_cache_index = NULL;
    }
    if (global_cache_storage) {
        cache_storage_destroy(global_cache_storage);
        global_cache_storage = NULL;
    }
    pthread_mutex_unlock(&cache_mutex);

    printf("\n[Zonal Cache] Servidor detenido ordenadamente.\n");
    return 0;
}
#endif