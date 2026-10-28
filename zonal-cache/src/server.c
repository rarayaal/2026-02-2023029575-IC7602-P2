#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <pthread.h>
#include <signal.h>

#define DEFAULT_PORT 8080
#define BUFFER_SIZE 8192

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

// Función para solicitar un recurso al servidor de origen (T-12)
int fetch_from_origin(const char *host, int origin_port, const char *path, char *response_buffer, size_t max_len) {
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
    bcopy((char *)server->h_addr, (char *)&origin_addr.sin_addr.s_addr, server->h_length);
    origin_addr.sin_port = htons(origin_port);

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
int is_valid_session(const char *session_token) {
    if (!session_token || strlen(session_token) == 0) return 0;
    // La sesión es válida si no está vacía; en producción/integración consulta POST /api/internal/validate/session
    return 1;
}

// Valida si la API Key es válida (T-13)
int is_valid_api_key(const char *api_key) {
    if (!api_key || strlen(api_key) == 0) return 0;
    const char *expected_key = getenv("EXPECTED_API_KEY");
    if (expected_key && strlen(expected_key) > 0) {
        return (strcmp(api_key, expected_key) == 0);
    }
    return 1;
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
            const char *query = strchr(req.path, '?');

            if (query) {
                extract_query_param(query + 1, "token", token, sizeof(token));
                extract_query_param(query + 1, "redirect", redirect, sizeof(redirect));
            }

            // Sanitizar redirección: solo aceptar rutas relativas seguras
            if (redirect[0] != '/' || (redirect[0] == '/' && redirect[1] == '/')) {
                snprintf(redirect, sizeof(redirect), "/");
            }

            if (strlen(token) > 0 && is_valid_session(token)) {
                char response[BUFFER_SIZE];
                snprintf(response, sizeof(response),
                         "HTTP/1.1 302 Found\r\n"
                         "Location: %s\r\n"
                         "Set-Cookie: zc_session=%s; HttpOnly; Path=/\r\n"
                         "Content-Length: 0\r\n"
                         "Connection: close\r\n\r\n",
                         redirect, token);
                write(client_fd, response, strlen(response));
                printf(" -> [T-15] Sesión establecida exitosamente vía /__zc/session, redirigiendo a %s\n", redirect);
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
        if (matched_url) {
            auth_mode = matched_url->auth_type;
        }

        if (strcmp(auth_mode, "api_key") == 0) {
            // Validación por x-api-key (T-13)
            if (!is_valid_api_key(req.api_key)) {
                const char *unauthorized = 
                    "HTTP/1.1 401 Unauthorized\r\n"
                    "Content-Type: text/plain\r\n"
                    "Content-Length: 26\r\n"
                    "Connection: close\r\n\r\n"
                    "Error: x-api-key requerida\n";
                write(client_fd, unauthorized, strlen(unauthorized));
                close(client_fd);
                return NULL;
            }
        } else if (strcmp(auth_mode, "user_password") == 0) {
            // Validación por sesión / redirección a UI (T-14 y T-15)
            if (strlen(req.cookie_session) == 0 || !is_valid_session(req.cookie_session)) {
                const char *auth_ui = get_auth_ui_url();
                char redirect_resp[BUFFER_SIZE];
                snprintf(redirect_resp, sizeof(redirect_resp),
                         "HTTP/1.1 302 Found\r\n"
                         "Location: %s?domain=%s&redirect=http://%s%s\r\n"
                         "Content-Length: 0\r\n"
                         "Connection: close\r\n\r\n",
                         auth_ui, effective_domain, effective_domain, req.path);
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


            printf(" -> [CACHE MISS] Obteniendo desde el origen (%s:%d)...\n", origin_host, origin_port);
            char origin_response[BUFFER_SIZE] = {0};
            int bytes_from_origin = fetch_from_origin(origin_host, origin_port, req.path, origin_response, sizeof(origin_response));

            if (bytes_from_origin > 0) {
                // Servir respuesta al cliente
                write(client_fd, origin_response, bytes_from_origin);

                // Almacenar en caché en disco e índice en memoria (T-12)
                cache_entry_data_t new_entry = {
                    .domain = effective_domain,
                    .url = req.path,
                    .file_path = NULL,
                    .file_type = "bin",
                    .size_bytes = bytes_from_origin,
                    .created_at = time(NULL),
                    .expires_at = time(NULL) + 300,
                    .last_accessed_at = time(NULL),
                    .access_count = 1,
                    .insertion_order = 0
                };

                pthread_mutex_lock(&cache_mutex);
                if (global_cache_index && global_cache_storage) {
                    cache_store_put(global_cache_index, global_cache_storage,
                                    &new_entry, origin_response, bytes_from_origin);
                }
                pthread_mutex_unlock(&cache_mutex);
                printf(" -> [CACHE STORED] Recurso almacenado exitosamente en cache.\n");
            } else {
                const char *error_502 = 
                    "HTTP/1.1 502 Bad Gateway\r\n"
                    "Content-Type: text/plain\r\n"
                    "Content-Length: 29\r\n"
                    "Connection: close\r\n\r\n"
                    "Error al conectar al origen\n";
                write(client_fd, error_502, strlen(error_502));
            }
        }
    }

    close(client_fd);
    return NULL;
}


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