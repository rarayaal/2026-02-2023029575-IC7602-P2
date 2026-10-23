#include <stdio.h>
#include <assert.h>
#include <string.h>
#include "http_util.h"

static void test_wildcard_matching(void) {
    // Coincidencias exactas
    assert(match_url_pattern("/index.html", "/index.html") == 1);
    assert(match_url_pattern("/login", "/login") == 1);
    assert(match_url_pattern("/login", "/logins") == 0);

    // Wildcards al final (ej. /admin/*)
    assert(match_url_pattern("/admin/*", "/admin/dashboard") == 1);
    assert(match_url_pattern("/admin/*", "/admin/users/123") == 1);
    assert(match_url_pattern("/admin/*", "/admin/") == 1);
    assert(match_url_pattern("/admin/*", "/admin") == 0);
    assert(match_url_pattern("/admin/*", "/other/path") == 0);

    // Wildcards al inicio (ej. *.png)
    assert(match_url_pattern("*.png", "/images/logo.png") == 1);
    assert(match_url_pattern("*.png", "photo.png") == 1);
    assert(match_url_pattern("*.png", "photo.jpg") == 0);

    // Wildcard global /*
    assert(match_url_pattern("/*", "/anything") == 1);
    assert(match_url_pattern("/*", "/a/b/c/d") == 1);
    assert(match_url_pattern("/*", "/") == 1);

    // Wildcard intermedio (/api/*/details)
    assert(match_url_pattern("/api/*/details", "/api/v1/details") == 1);
    assert(match_url_pattern("/api/*/details", "/api/users/details") == 1);
    assert(match_url_pattern("/api/*/details", "/api/v1/overview") == 0);

    printf("✓ test_wildcard_matching completado con éxito.\n");
}

static void test_http_parsing(void) {
    const char *raw_request = 
        "GET /admin/dashboard?view=full HTTP/1.1\r\n"
        "Host: example.com:8080\r\n"
        "User-Agent: Mozilla/5.0\r\n"
        "x-api-key: secret_key_12345\r\n"
        "Cookie: user=test; zc_session=session_token_xyz; theme=dark\r\n"
        "\r\n";

    HTTPRequest req;
    parse_http_request(raw_request, &req);

    assert(strcmp(req.method, "GET") == 0);
    assert(strcmp(req.path, "/admin/dashboard?view=full") == 0);
    assert(strcmp(req.host, "example.com") == 0);
    assert(strcmp(req.api_key, "secret_key_12345") == 0);
    assert(strcmp(req.cookie_session, "session_token_xyz") == 0);

    printf("✓ test_http_parsing completado con éxito.\n");
}

int main(void) {
    printf("[Running T-10 Unit Tests]\n");
    test_wildcard_matching();
    test_http_parsing();
    printf("Todos los tests de T-10 pasaron correctamente.\n");
    return 0;
}
