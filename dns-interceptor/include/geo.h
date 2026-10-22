#ifndef GEO_H
#define GEO_H

#include <stddef.h>
#include <stdint.h>

#define GEO_COUNTRY_CODE_LEN 4
#define GEO_MAX_RANGES 128

/* Estructura para almacenar un rango de direcciones IP y su país asociado */
typedef struct {
  uint32_t ip_start;
  uint32_t ip_end;
  char country_code[GEO_COUNTRY_CODE_LEN];
} ip_range_t;

/* Inicializa la tabla de geolocalización con los rangos base de IP to Country
 */
void geo_init(void);

/* Carga un rango de IP numérico asociado a un código de país */
void geo_add_range(const char *start_ip, const char *end_ip,
                   const char *country_code);

/* Resuelve el código de país a partir de una dirección IP en formato texto */
const char *geo_lookup_country(const char *ip_str);

#endif /* GEO_H */
