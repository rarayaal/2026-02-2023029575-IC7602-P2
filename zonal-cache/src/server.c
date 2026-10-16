#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <pthread.h>

#define PORT 8080
#define BUFFER_SIZE 8192

// Estructura para almacenar los datos parseados de la petición
typedef struct {
    char method[16];
    char path[256];
    char api_key[128];
} HTTPRequest;

// Parsea el método, path y el encabezado x-api-key
void parse_http_request(const char *buffer, HTTPRequest *req) {
    memset(req, 0, sizeof(HTTPRequest));

    sscanf(buffer, "%15s %255s", req->method, req->path);

    const char *key_header = strcasestr(buffer, "x-api-key:");
    if (key_header) {
        key_header += strlen("x-api-key:");
        while (*key_header == ' ') key_header++;
        
        int i = 0;
        while (*key_header != '\r' && *key_header != '\n' && *key_header != '\0' && i < 127) {
            req->api_key[i++] = *key_header++;
        }
        req->api_key[i] = '\0';
    }
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

void *handle_client(void *client_socket_ptr) {
    int client_fd = *(int *)client_socket_ptr;
    free(client_socket_ptr);
    char buffer[BUFFER_SIZE] = {0};

    ssize_t bytes_read = read(client_fd, buffer, BUFFER_SIZE - 1);
    if (bytes_read > 0) {
        HTTPRequest req;
        parse_http_request(buffer, &req);

        printf("\n[Petición Recibida]\n");
        printf(" -> Método: %s\n", req.method);
        printf(" -> Path:   %s\n", req.path);
        printf(" -> APIKey: %s\n", strlen(req.api_key) > 0 ? req.api_key : "(Ninguna)");

        // Validar seguridad (T-13)
        if (strlen(req.api_key) == 0) {
            const char *unauthorized = 
                "HTTP/1.1 401 Unauthorized\r\n"
                "Content-Type: text/plain\r\n"
                "Content-Length: 26\r\n"
                "Connection: close\r\n\r\n"
                "Error: x-api-key requerida\n";
            write(client_fd, unauthorized, strlen(unauthorized));
        } else {
            // Intentar traer el recurso desde el origen (T-12)
            printf(" -> Obteniendo desde el origen (httpbin.org)...\n");
            char origin_response[BUFFER_SIZE] = {0};
            
            // Usamos httpbin.org/anything como origen de prueba
            int bytes_from_origin = fetch_from_origin("httpbin.org", 80, "/anything", origin_response, sizeof(origin_response));

            if (bytes_from_origin > 0) {
                write(client_fd, origin_response, bytes_from_origin);
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

int main() {
    int server_fd;
    struct sockaddr_in address;
    int opt = 1;
    socklen_t addrlen = sizeof(address);

    if ((server_fd = socket(AF_INET, SOCK_STREAM, 0)) == 0) {
        perror("Socket falló");
        exit(EXIT_FAILURE);
    }

    setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(PORT);

    if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) < 0) {
        perror("Bind falló");
        exit(EXIT_FAILURE);
    }

    if (listen(server_fd, 10) < 0) {
        perror("Listen falló");
        exit(EXIT_FAILURE);
    }

    printf("[Zonal Cache] Servidor HTTP listo en puerto %d (T-09, T-10, T-12, T-13)... \n", PORT);

    while (1) {
        int *new_sock = malloc(sizeof(int));
        if ((*new_sock = accept(server_fd, (struct sockaddr *)&address, &addrlen)) < 0) {
            perror("Accept falló");
            free(new_sock);
            continue;
        }

        pthread_t thread_id;
        if (pthread_create(&thread_id, NULL, handle_client, new_sock) != 0) {
            perror("No se pudo crear el hilo");
            free(new_sock);
        } else {
            pthread_detach(thread_id);
        }
    }

    close(server_fd);
    return 0;
}