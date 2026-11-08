#define _POSIX_C_SOURCE 200809L
#define TESTING_NO_MAIN
#include <stdio.h>
#include <stdlib.h>
#include <assert.h>
#include <string.h>

// Incluimos server.c directamente para probar sus funciones estáticas / internas de validación
#include "../src/server.c"

static void test_api_key_rejection(void) {
    unsetenv("EXPECTED_API_KEY");
    unsetenv("CONFIG_API_URL");
    unsetenv("CONFIG_API_TOKEN");

    // Caso 1: Sin EXPECTED_API_KEY ni API remota, debe RECHAZAR cualquier clave, incluso en localhost/default
    assert(is_valid_api_key("localhost", "url_test", "cualquier_clave") == 0);
    assert(is_valid_api_key("default", "url_test", "cualquier_clave") == 0);
    assert(is_valid_api_key("example.com", "url_test", "cualquier_clave") == 0);
    assert(is_valid_api_key("localhost", "url_test", "") == 0);
    assert(is_valid_api_key("localhost", "url_test", NULL) == 0);

    // Caso 2: Con EXPECTED_API_KEY configurado para pruebas locales
    setenv("EXPECTED_API_KEY", "secreto_valido_123", 1);
    assert(is_valid_api_key("localhost", "url_test", "clave_invalida") == 0);
    assert(is_valid_api_key("localhost", "url_test", "secreto_valido_123") == 1);
    assert(is_valid_api_key("default", "url_test", "secreto_valido_123") == 1);
    assert(is_valid_api_key("midominio.com", "url_test", "secreto_valido_123") == 1);

    printf("✓ test_api_key_rejection (T-13) completado con éxito.\n");
}

static void test_session_rejection(void) {
    unsetenv("EXPECTED_SESSION_TOKEN");
    unsetenv("CONFIG_API_URL");
    unsetenv("CONFIG_API_TOKEN");

    // Caso 1: Sin EXPECTED_SESSION_TOKEN ni API remota, debe RECHAZAR cualquier sesión, incluso en localhost/default
    assert(is_valid_session("localhost", "url_test", "sesion_falsa") == 0);
    assert(is_valid_session("default", "url_test", "sesion_falsa") == 0);
    assert(is_valid_session("example.com", "url_test", "sesion_falsa") == 0);
    assert(is_valid_session("localhost", "url_test", "") == 0);
    assert(is_valid_session("localhost", "url_test", NULL) == 0);

    // Caso 2: Con EXPECTED_SESSION_TOKEN configurado para pruebas locales
    setenv("EXPECTED_SESSION_TOKEN", "token_sesion_seguro_999", 1);
    assert(is_valid_session("localhost", "url_test", "token_invalido") == 0);
    assert(is_valid_session("localhost", "url_test", "token_sesion_seguro_999") == 1);
    assert(is_valid_session("default", "url_test", "token_sesion_seguro_999") == 1);
    assert(is_valid_session("midominio.com", "url_test", "token_sesion_seguro_999") == 1);

    printf("✓ test_session_rejection (T-15) completado con éxito.\n");
}

int main(void) {
    printf("[Running Security Unit Tests (T-13 & T-15)]\n");
    test_api_key_rejection();
    test_session_rejection();
    printf("Todos los tests de seguridad pasaron correctamente.\n");
    return 0;
}

