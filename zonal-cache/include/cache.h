#ifndef ZONAL_CACHE_CACHE_H
#define ZONAL_CACHE_CACHE_H

#include <stddef.h>
#include <time.h>

/* El motor no conoce sockets ni HTTP: solo administra recursos cacheables. */
typedef enum {
    CACHE_POLICY_LRU,
    CACHE_POLICY_MRU,
    CACHE_POLICY_LFU,
    CACHE_POLICY_FIFO,
    CACHE_POLICY_RANDOM
} cache_policy_t;

typedef enum {
    CACHE_OK = 0,
    CACHE_NOT_FOUND,
    CACHE_ALREADY_EXISTS,
    CACHE_INVALID_ARGUMENT,
    CACHE_OUT_OF_MEMORY,
    CACHE_IO_ERROR,
    CACHE_BUFFER_TOO_SMALL
} cache_result_t;

typedef struct {
    const char *domain;
    const char *url;
    const char *file_path;
    const char *file_type;
    size_t size_bytes;
    time_t created_at;
    time_t expires_at;
    time_t last_accessed_at;
    unsigned long access_count;
    unsigned long insertion_order;
} cache_entry_data_t;

typedef struct cache_index cache_index_t;
typedef struct cache_storage cache_storage_t;

/* Crea un indice vacío. El llamador es dueño del puntero devuelto. */
cache_index_t *cache_index_create(size_t bucket_count);

/* Libera el indice y todas las cadenas copiadas internamente. */
void cache_index_destroy(cache_index_t *index);

/* Agrega una entrada; domain y url juntos forman la clave única. */
cache_result_t cache_index_insert(cache_index_t *index,
                                  const cache_entry_data_t *entry);

/* Obtiene una entrada sin transferir su propiedad al llamador. */
cache_result_t cache_index_get(const cache_index_t *index,
                               const char *domain,
                               const char *url,
                               cache_entry_data_t *entry_out);

/* Actualiza metadatos de una entrada ya existente. */
cache_result_t cache_index_update(cache_index_t *index,
                                  const cache_entry_data_t *entry);

/* Elimina una entrada y libera sus recursos internos. */
cache_result_t cache_index_remove(cache_index_t *index,
                                  const char *domain,
                                  const char *url);

/* Registra un acceso y actualiza los datos usados por políticas futuras. */
cache_result_t cache_index_touch(cache_index_t *index,
                                 const char *domain,
                                 const char *url,
                                 time_t accessed_at);

/* Cantidad actual de entradas almacenadas. */
size_t cache_index_size(const cache_index_t *index);

/* Crea el almacenamiento bajo root_path y sus directorios necesarios. */
cache_storage_t *cache_storage_create(const char *root_path);

/* Libera el almacenamiento, no elimina archivos existentes. */
void cache_storage_destroy(cache_storage_t *storage);

/* Obtiene la ruta determinista donde se guarda una entrada. */
cache_result_t cache_storage_path(const cache_storage_t *storage,
                                  const char *domain,
                                  const char *url,
                                  char *path_out,
                                  size_t path_capacity);

/* Escribe el contenido usando un archivo temporal y luego rename atomico. */
cache_result_t cache_storage_write(const cache_storage_t *storage,
                                   const char *domain,
                                   const char *url,
                                   const void *data,
                                   size_t data_size);

/* Lee un recurso; reserva data_out y el llamador debe liberarlo con free. */
cache_result_t cache_storage_read(const cache_storage_t *storage,
                                  const char *domain,
                                  const char *url,
                                  void **data_out,
                                  size_t *data_size_out);

/* Elimina el archivo del recurso; no elimina el directorio del dominio. */
cache_result_t cache_storage_remove(const cache_storage_t *storage,
                                    const char *domain,
                                    const char *url);

/* Coordina escritura en disco e insercion en el indice, con rollback ante error. */
cache_result_t cache_store_put(cache_index_t *index,
                               const cache_storage_t *storage,
                               const cache_entry_data_t *entry,
                               const void *data,
                               size_t data_size);

/* Consulta el indice y luego lee el contenido persistido. */
cache_result_t cache_store_get(const cache_index_t *index,
                               const cache_storage_t *storage,
                               const char *domain,
                               const char *url,
                               cache_entry_data_t *entry_out,
                               void **data_out,
                               size_t *data_size_out);

/* Elimina el archivo y su entrada del indice. */
cache_result_t cache_store_remove(cache_index_t *index,
                                  const cache_storage_t *storage,
                                  const char *domain,
                                  const char *url);

#endif