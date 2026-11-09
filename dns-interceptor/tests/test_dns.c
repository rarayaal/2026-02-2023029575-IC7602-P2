#include "dns.h"
#include "geo.h"

#include <assert.h>
#include <stdio.h>
#include <string.h>

/* Valida la carga de rangos GeoIP desde archivo CSV */
static void test_geo_load_csv_and_lookup(void) {
  int loaded = geo_load_from_csv("config/ip_to_country.csv");
  if (loaded < 0) {
    loaded = geo_load_from_csv("../config/ip_to_country.csv");
  }
  assert(loaded > 0);

  /* Prueba IP de Costa Rica */
  const char *cr = geo_lookup_country("190.113.10.5");
  assert(cr != NULL);
  assert(strcmp(cr, "CR") == 0);

  /* Prueba IP de Estados Unidos */
  const char *us = geo_lookup_country("8.8.8.8");
  assert(us != NULL);
  assert(strcmp(us, "US") == 0);

  /* Prueba IP desconocida */
  const char *unknown = geo_lookup_country("240.0.0.1");
  assert(unknown == NULL);

  printf("[TEST PASSED] test_geo_load_csv_and_lookup\n");
}

/* Valida la construcción exacta de un paquete binario de respuesta DNS tipo A
 */
static void test_construye_respuesta_binaria_valida(void) {
  const uint8_t query_raw[] = {
      0x1a, 0x2b, /* ID: 0x1a2b */
      0x01, 0x00, /* Flags: RD = 1 */
      0x00, 0x01, /* QDCOUNT = 1 */
      0x00, 0x00, /* ANCOUNT = 0 */
      0x00, 0x00, /* NSCOUNT = 0 */
      0x00, 0x00, /* ARCOUNT = 0 */
      0x04, 't',  'e', 's', 't',
      0x03, 'c',  'o', 'm', 0x00, /* QNAME: test.com */
      0x00, 0x01,                 /* QTYPE: A (1) */
      0x00, 0x01                  /* QCLASS: IN (1) */
  };

  uint8_t resp_buf[DNS_BUFFER_SIZE];
  const char *target_ip = "192.168.1.100";
  uint32_t target_ttl = 300;

  ssize_t resp_len = dns_build_response(query_raw, sizeof(query_raw), target_ip,
                                        target_ttl, resp_buf, sizeof(resp_buf));

  assert(resp_len > 0);

  /* Comprueba que el ID coincida */
  assert(resp_buf[0] == 0x1a);
  assert(resp_buf[1] == 0x2b);

  /* Comprueba banderas de respuesta autoritativa (QR=1, AA=1, RD=1, RA=1) */
  assert(resp_buf[2] == 0x85);
  assert(resp_buf[3] == 0x80);

  /* Comprueba contadores */
  assert(resp_buf[4] == 0x00 && resp_buf[5] == 0x01); /* QDCOUNT = 1 */
  assert(resp_buf[6] == 0x00 && resp_buf[7] == 0x01); /* ANCOUNT = 1 */

  /* Comprueba que los últimos 4 bytes contengan la IP serializada */
  assert(resp_buf[resp_len - 4] == 192);
  assert(resp_buf[resp_len - 3] == 168);
  assert(resp_buf[resp_len - 2] == 1);
  assert(resp_buf[resp_len - 1] == 100);

  printf("[TEST PASSED] test_construye_respuesta_binaria_valida\n");
}

/* Valida el rechazo de paquetes con formato inválido */
static void test_rechaza_paquetes_invalidos(void) {
  uint8_t short_query[10] = {0};
  uint8_t resp_buf[DNS_BUFFER_SIZE];

  ssize_t result =
      dns_build_response(short_query, sizeof(short_query), "10.0.0.1", 60,
                         resp_buf, sizeof(resp_buf));
  assert(result == -1);

  printf("[TEST PASSED] test_rechaza_paquetes_invalidos\n");
}

int main(void) {
  printf("Ejecutando pruebas unitarias de serializacion DNS (RFC 2929) y GeoIP...\n");
  test_geo_load_csv_and_lookup();
  test_construye_respuesta_binaria_valida();
  test_rechaza_paquetes_invalidos();
  printf("Todas las pruebas pasaron satisfactoriamente.\n");
  return 0;
}
