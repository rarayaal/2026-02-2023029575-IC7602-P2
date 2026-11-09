#ifndef GEO_H
#define GEO_H

#include <stddef.h>
#include <stdint.h>

#define GEO_COUNTRY_CODE_LEN 4
#define GEO_MAX_RANGES 1024

/* Estructura para almacenar un rango de direcciones IP y su país asociado */
typedef struct {
  uint32_t ip_start;
  uint32_t ip_end;
  char country_code[GEO_COUNTRY_CODE_LEN];
} ip_range_t;

/* Inicializa la tabla de geolocalización.
 * Intenta cargar desde GEO_DB_PATH o IP_TO_COUNTRY_PATH, o desde config/ip_to_country.csv.
 * Si falla, usa rangos sembrados por defecto.
 */
void geo_init(void);

/* Carga rangos de geolocalización desde un archivo CSV.
 * Retorna el número de rangos cargados exitosamente, o -1 en caso de error al abrir el archivo.
 */
int geo_load_from_csv(const char *filepath);

/* Carga un rango de IP numérico asociado a un código de país */
void geo_add_range(const char *start_ip, const char *end_ip,
                   const char *country_code);

/* Resuelve el código de país a partir de una dirección IP en formato texto */
const char *geo_lookup_country(const char *ip_str);

#endif /* GEO_H */
