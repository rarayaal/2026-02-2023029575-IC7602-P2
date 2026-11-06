#include "cache.h"

#include <errno.h>
#include <limits.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

#ifndef PATH_MAX
#define PATH_MAX 4096
#endif

typedef struct cache_node {
    cache_entry_data_t entry;
    struct cache_node *next;
} cache_node_t;

struct cache_index {
    cache_node_t **buckets;
    size_t bucket_count;
    size_t entry_count;
    unsigned long next_insertion_order;
};

struct cache_storage {
    char *root_path;
};

static char *copy_string(const char *value) {
    size_t length;
    char *copy;

    if (value == NULL) {
        return NULL;
    }

    length = strlen(value) + 1;
    copy = malloc(length);
    if (copy != NULL) {
        memcpy(copy, value, length);
    }
    return copy;
}

static void free_entry(cache_entry_data_t *entry) {
    free((char *)entry->domain);
    free((char *)entry->url);
    free((char *)entry->file_path);
    free((char *)entry->file_type);
}

static int copy_entry(cache_entry_data_t *destination,
                      const cache_entry_data_t *source) {
    memset(destination, 0, sizeof(*destination));
    destination->domain = copy_string(source->domain);
    destination->url = copy_string(source->url);
    destination->file_path = copy_string(source->file_path);
    destination->file_type = copy_string(source->file_type);

    if (destination->domain == NULL || destination->url == NULL ||
        (source->file_path != NULL && destination->file_path == NULL) ||
        (source->file_type != NULL && destination->file_type == NULL)) {
        free_entry(destination);
        return 0;
    }

    destination->size_bytes = source->size_bytes;
    destination->created_at = source->created_at;
    destination->expires_at = source->expires_at;
    destination->last_accessed_at = source->last_accessed_at;
    destination->access_count = source->access_count;
    destination->insertion_order = source->insertion_order;
    return 1;
}

static size_t hash_key(const char *domain, const char *url, size_t bucket_count) {
    unsigned long hash = 5381;
    const unsigned char *part;

    for (part = (const unsigned char *)domain; *part != '\0'; part++) {
        hash = ((hash << 5) + hash) ^ *part;
    }
    hash = ((hash << 5) + hash) ^ ':';
    for (part = (const unsigned char *)url; *part != '\0'; part++) {
        hash = ((hash << 5) + hash) ^ *part;
    }
    return (size_t)(hash % bucket_count);
}

static cache_node_t *find_node(const cache_index_t *index,
                               const char *domain,
                               const char *url,
                               cache_node_t **previous_out) {
    size_t bucket;
    cache_node_t *previous = NULL;
    cache_node_t *current;

    bucket = hash_key(domain, url, index->bucket_count);
    current = index->buckets[bucket];
    while (current != NULL) {
        if (strcmp(current->entry.domain, domain) == 0 &&
            strcmp(current->entry.url, url) == 0) {
            if (previous_out != NULL) {
                *previous_out = previous;
            }
            return current;
        }
        previous = current;
        current = current->next;
    }
    return NULL;
}

cache_index_t *cache_index_create(size_t bucket_count) {
    cache_index_t *index;

    if (bucket_count == 0) {
        return NULL;
    }
    index = calloc(1, sizeof(*index));
    if (index == NULL) {
        return NULL;
    }
    index->buckets = calloc(bucket_count, sizeof(*index->buckets));
    if (index->buckets == NULL) {
        free(index);
        return NULL;
    }
    index->bucket_count = bucket_count;
    index->next_insertion_order = 1;
    return index;
}

void cache_index_destroy(cache_index_t *index) {
    size_t bucket;

    if (index == NULL) {
        return;
    }
    for (bucket = 0; bucket < index->bucket_count; bucket++) {
        cache_node_t *current = index->buckets[bucket];
        while (current != NULL) {
            cache_node_t *next = current->next;
            free_entry(&current->entry);
            free(current);
            current = next;
        }
    }
    free(index->buckets);
    free(index);
}

cache_result_t cache_index_insert(cache_index_t *index,
                                  const cache_entry_data_t *entry) {
    cache_node_t *node;
    size_t bucket;

    if (index == NULL || entry == NULL || entry->domain == NULL ||
        entry->url == NULL || entry->domain[0] == '\0' || entry->url[0] == '\0') {
        return CACHE_INVALID_ARGUMENT;
    }
    if (find_node(index, entry->domain, entry->url, NULL) != NULL) {
        return CACHE_ALREADY_EXISTS;
    }
    node = calloc(1, sizeof(*node));
    if (node == NULL || !copy_entry(&node->entry, entry)) {
        free(node);
        return CACHE_OUT_OF_MEMORY;
    }
    node->entry.insertion_order = index->next_insertion_order++;
    bucket = hash_key(entry->domain, entry->url, index->bucket_count);
    node->next = index->buckets[bucket];
    index->buckets[bucket] = node;
    index->entry_count++;
    return CACHE_OK;
}

cache_result_t cache_index_get(const cache_index_t *index,
                               const char *domain,
                               const char *url,
                               cache_entry_data_t *entry_out) {
    cache_node_t *node;

    if (index == NULL || domain == NULL || url == NULL || entry_out == NULL) {
        return CACHE_INVALID_ARGUMENT;
    }
    node = find_node(index, domain, url, NULL);
    if (node == NULL) {
        return CACHE_NOT_FOUND;
    }
    *entry_out = node->entry;
    return CACHE_OK;
}

cache_result_t cache_index_update(cache_index_t *index,
                                  const cache_entry_data_t *entry) {
    cache_node_t *node;
    cache_entry_data_t replacement;

    if (index == NULL || entry == NULL || entry->domain == NULL ||
        entry->url == NULL) {
        return CACHE_INVALID_ARGUMENT;
    }
    node = find_node(index, entry->domain, entry->url, NULL);
    if (node == NULL) {
        return CACHE_NOT_FOUND;
    }
    if (!copy_entry(&replacement, entry)) {
        return CACHE_OUT_OF_MEMORY;
    }
    replacement.insertion_order = node->entry.insertion_order;
    free_entry(&node->entry);
    node->entry = replacement;
    return CACHE_OK;
}

cache_result_t cache_index_remove(cache_index_t *index,
                                  const char *domain,
                                  const char *url) {
    cache_node_t *previous;
    cache_node_t *node;
    size_t bucket;

    if (index == NULL || domain == NULL || url == NULL) {
        return CACHE_INVALID_ARGUMENT;
    }
    node = find_node(index, domain, url, &previous);
    if (node == NULL) {
        return CACHE_NOT_FOUND;
    }
    bucket = hash_key(domain, url, index->bucket_count);
    if (previous == NULL) {
        index->buckets[bucket] = node->next;
    } else {
        previous->next = node->next;
    }
    free_entry(&node->entry);
    free(node);
    index->entry_count--;
    return CACHE_OK;
}

cache_result_t cache_index_touch(cache_index_t *index,
                                 const char *domain,
                                 const char *url,
                                 time_t accessed_at) {
    cache_node_t *node;

    if (index == NULL || domain == NULL || url == NULL) {
        return CACHE_INVALID_ARGUMENT;
    }
    node = find_node(index, domain, url, NULL);
    if (node == NULL) {
        return CACHE_NOT_FOUND;
    }
    node->entry.last_accessed_at = accessed_at;
    node->entry.access_count++;
    return CACHE_OK;
}

size_t cache_index_size(const cache_index_t *index) {
    return index == NULL ? 0 : index->entry_count;
}

size_t cache_index_domain_size(const cache_index_t *index,
                               const char *domain) {
    size_t bucket;
    size_t total = 0;

    if (index == NULL || domain == NULL) {
        return 0;
    }
    for (bucket = 0; bucket < index->bucket_count; bucket++) {
        cache_node_t *current = index->buckets[bucket];
        while (current != NULL) {
            if (strcmp(current->entry.domain, domain) == 0) {
                if ((size_t)-1 - total < current->entry.size_bytes) {
                    return (size_t)-1;
                }
                total += current->entry.size_bytes;
            }
            current = current->next;
        }
    }
    return total;
}

static int valid_policy(cache_policy_t policy) {
    return policy >= CACHE_POLICY_LRU && policy <= CACHE_POLICY_RANDOM;
}

static int entry_is_better_victim(const cache_entry_data_t *candidate,
                                  const cache_entry_data_t *current,
                                  cache_policy_t policy) {
    if (policy == CACHE_POLICY_LRU) {
        return candidate->last_accessed_at < current->last_accessed_at ||
               (candidate->last_accessed_at == current->last_accessed_at &&
                candidate->insertion_order < current->insertion_order);
    }
    if (policy == CACHE_POLICY_MRU) {
        return candidate->last_accessed_at > current->last_accessed_at ||
               (candidate->last_accessed_at == current->last_accessed_at &&
                candidate->insertion_order > current->insertion_order);
    }
    if (policy == CACHE_POLICY_LFU) {
        return candidate->access_count < current->access_count ||
               (candidate->access_count == current->access_count &&
                candidate->insertion_order < current->insertion_order);
    }
    return candidate->insertion_order < current->insertion_order;
}

cache_result_t cache_index_select_victim(const cache_index_t *index,
                                         const char *domain,
                                         cache_policy_t policy,
                                         cache_entry_data_t *entry_out) {
    size_t bucket;
    size_t candidate_count = 0;
    cache_node_t *victim = NULL;

    if (index == NULL || domain == NULL || entry_out == NULL ||
        !valid_policy(policy)) {
        return CACHE_INVALID_ARGUMENT;
    }
    for (bucket = 0; bucket < index->bucket_count; bucket++) {
        cache_node_t *current = index->buckets[bucket];
        while (current != NULL) {
            if (strcmp(current->entry.domain, domain) == 0) {
                candidate_count++;
                if (policy == CACHE_POLICY_RANDOM) {
                    if (rand() % candidate_count == 0) {
                        victim = current;
                    }
                } else if (victim == NULL || entry_is_better_victim(
                                             &current->entry,
                                             &victim->entry,
                                             policy)) {
                    victim = current;
                }
            }
            current = current->next;
        }
    }
    if (victim == NULL) {
        return CACHE_NOT_FOUND;
    }
    *entry_out = victim->entry;
    return CACHE_OK;
}

time_t cache_ttl_expiration(const cache_ttl_config_t *config,
                            const char *file_type,
                            time_t created_at) {
    size_t rule_index;
    time_t ttl_seconds;

    if (config == NULL || created_at < 0) {
        return 0;
    }
    ttl_seconds = config->default_ttl_seconds;
    for (rule_index = 0; rule_index < config->rule_count; rule_index++) {
        const cache_ttl_rule_t *rule = &config->rules[rule_index];
        if (rule->file_type != NULL && file_type != NULL &&
            strcmp(rule->file_type, file_type) == 0) {
            ttl_seconds = rule->ttl_seconds;
            break;
        }
    }
    if (ttl_seconds <= 0) {
        return 0;
    }
    return created_at + ttl_seconds;
}


int cache_entry_is_expired(const cache_entry_data_t *entry, time_t now) {
    if (entry == NULL || now < 0 || entry->expires_at == 0) {
        return 0;
    }
    return now >= entry->expires_at;
}

cache_result_t cache_index_purge_expired(cache_index_t *index,
                                         time_t now,
                                         size_t *removed_count) {
    size_t bucket;
    size_t removed = 0;

    if (index == NULL || now < 0) {
        return CACHE_INVALID_ARGUMENT;
    }
    for (bucket = 0; bucket < index->bucket_count; bucket++) {
        cache_node_t *previous = NULL;
        cache_node_t *current = index->buckets[bucket];
        while (current != NULL) {
            cache_node_t *next = current->next;
            if (cache_entry_is_expired(&current->entry, now)) {
                if (previous == NULL) {
                    index->buckets[bucket] = next;
                } else {
                    previous->next = next;
                }
                free_entry(&current->entry);
                free(current);
                index->entry_count--;
                removed++;
            } else {
                previous = current;
            }
            current = next;
        }
    }
    if (removed_count != NULL) {
        *removed_count = removed;
    }
    return CACHE_OK;
}

static uint64_t hash_url(const char *url) {
    uint64_t hash = UINT64_C(14695981039346656037);
    const unsigned char *part = (const unsigned char *)url;

    while (*part != '\0') {
        hash ^= *part++;
        hash *= UINT64_C(1099511628211);
    }
    return hash;
}

static cache_result_t metadata_path(const char *content_path,
                                    char *path_out,
                                    size_t path_capacity) {
    int written = snprintf(path_out, path_capacity, "%s.url", content_path);

    if (written < 0 || (size_t)written >= path_capacity) {
        return CACHE_BUFFER_TOO_SMALL;
    }
    return CACHE_OK;
}

static cache_result_t metadata_matches(const char *content_path,
                                       const char *url) {
    char metadata_file_path[PATH_MAX];
    char stored_url[PATH_MAX];
    FILE *metadata_file;
    size_t length;
    cache_result_t result;

    result = metadata_path(content_path, metadata_file_path,
                           sizeof(metadata_file_path));
    if (result != CACHE_OK) {
        return result;
    }
    metadata_file = fopen(metadata_file_path, "rb");
    if (metadata_file == NULL) {
        return errno == ENOENT ? CACHE_NOT_FOUND : CACHE_IO_ERROR;
    }
    if (fgets(stored_url, sizeof(stored_url), metadata_file) == NULL) {
        fclose(metadata_file);
        return CACHE_IO_ERROR;
    }
    fclose(metadata_file);
    length = strlen(stored_url);
    if (length > 0 && stored_url[length - 1] == '\n') {
        stored_url[length - 1] = '\0';
    }
    return strcmp(stored_url, url) == 0 ? CACHE_OK : CACHE_HASH_COLLISION;
}

static cache_result_t validate_storage_slot(const char *content_path,
                                            const char *url) {
    cache_result_t result;

    if (access(content_path, F_OK) != 0 && errno == ENOENT) {
        return CACHE_OK;
    }
    result = metadata_matches(content_path, url);
    return result == CACHE_NOT_FOUND ? CACHE_HASH_COLLISION : result;
}

static int valid_domain_path(const char *domain) {
    const char *character;

    if (domain == NULL || domain[0] == '\0' || strcmp(domain, ".") == 0 ||
        strcmp(domain, "..") == 0) {
        return 0;
    }
    for (character = domain; *character != '\0'; character++) {
        if (*character == '/' || *character == '\\') {
            return 0;
        }
    }
    return 1;
}

static int make_directory(const char *path) {
    return mkdir(path, 0750) == 0 || errno == EEXIST;
}

static int make_directories(const char *path) {
    char buffer[PATH_MAX];
    char *separator;

    if (path == NULL || strlen(path) >= sizeof(buffer)) {
        return 0;
    }
    strcpy(buffer, path);
    /* Se crean uno por uno los componentes para soportar rutas anidadas. */
    for (separator = buffer + 1; *separator != '\0'; separator++) {
        if (*separator == '/') {
            *separator = '\0';
            if (!make_directory(buffer)) {
                return 0;
            }
            *separator = '/';
        }
    }
    return make_directory(buffer);
}

cache_storage_t *cache_storage_create(const char *root_path) {
    cache_storage_t *storage;

    if (root_path == NULL || root_path[0] == '\0' || strlen(root_path) >= PATH_MAX) {
        return NULL;
    }
    storage = calloc(1, sizeof(*storage));
    if (storage == NULL) {
        return NULL;
    }
    storage->root_path = copy_string(root_path);
    if (storage->root_path == NULL || !make_directories(root_path)) {
        free(storage->root_path);
        free(storage);
        return NULL;
    }
    return storage;
}

void cache_storage_destroy(cache_storage_t *storage) {
    if (storage != NULL) {
        free(storage->root_path);
        free(storage);
    }
}

cache_result_t cache_storage_path(const cache_storage_t *storage,
                                  const char *domain,
                                  const char *url,
                                  char *path_out,
                                  size_t path_capacity) {
    char domain_path[PATH_MAX];
    int written;

    if (storage == NULL || !valid_domain_path(domain) || url == NULL ||
        path_out == NULL || url[0] == '\0') {
        return CACHE_INVALID_ARGUMENT;
    }
    written = snprintf(domain_path, sizeof(domain_path), "%s/%s",
                       storage->root_path, domain);
    if (written < 0 || (size_t)written >= sizeof(domain_path) ||
        !make_directories(domain_path)) {
        return CACHE_IO_ERROR;
    }
    written = snprintf(path_out, path_capacity, "%s/%s/%016llx.cache",
                       storage->root_path, domain,
                       (unsigned long long)hash_url(url));
    if (written < 0 || (size_t)written >= path_capacity) {
        return CACHE_BUFFER_TOO_SMALL;
    }
    return CACHE_OK;
}

cache_result_t cache_storage_write(const cache_storage_t *storage,
                                   const char *domain,
                                   const char *url,
                                   const void *data,
                                   size_t data_size) {
    char path[PATH_MAX];
    char temporary_path[PATH_MAX];
    char metadata_file_path[PATH_MAX];
    char temporary_metadata_path[PATH_MAX];
    FILE *file;
    FILE *metadata_file;
    int metadata_ok = 0;
    cache_result_t result;

    if ((data == NULL && data_size != 0) || url == NULL ||
        strchr(url, '\n') != NULL || strchr(url, '\r') != NULL) {
        return CACHE_INVALID_ARGUMENT;
    }
    /* El temporal evita dejar un archivo final incompleto si falla fwrite. */
    result = cache_storage_path(storage, domain, url, path, sizeof(path));
    if (result != CACHE_OK) {
        return result;
    }
    result = validate_storage_slot(path, url);
    if (result != CACHE_OK) {
        return result;
    }
    result = metadata_path(path, metadata_file_path, sizeof(metadata_file_path));
    if (result != CACHE_OK) {
        return result;
    }
    if (snprintf(temporary_path, sizeof(temporary_path), "%s.tmp.%ld", path,
                 (long)getpid()) >= (int)sizeof(temporary_path)) {
        return CACHE_BUFFER_TOO_SMALL;
    }
    if (snprintf(temporary_metadata_path, sizeof(temporary_metadata_path),
                 "%s.tmp.%ld", metadata_file_path, (long)getpid()) >=
        (int)sizeof(temporary_metadata_path)) {
        return CACHE_BUFFER_TOO_SMALL;
    }
    file = fopen(temporary_path, "wb");
    if (file == NULL) {
        return CACHE_IO_ERROR;
    }
    if (data_size != 0 && fwrite(data, 1, data_size, file) != data_size) {
        fclose(file);
        remove(temporary_path);
        return CACHE_IO_ERROR;
    }
    metadata_file = fopen(temporary_metadata_path, "wb");
    if (metadata_file != NULL) {
        int metadata_write_ok = fprintf(metadata_file, "%s\n", url) >= 0;
        int metadata_close_ok = fclose(metadata_file) == 0;
        if (metadata_write_ok && metadata_close_ok) {
            metadata_ok = 1;
        }
    }
    if (!metadata_ok) {
        fclose(file);
        remove(temporary_path);
        remove(temporary_metadata_path);
        return CACHE_IO_ERROR;
    }
    if (fclose(file) != 0 || rename(temporary_path, path) != 0) {
        remove(temporary_path);
        remove(temporary_metadata_path);
        return CACHE_IO_ERROR;
    }
    if (rename(temporary_metadata_path, metadata_file_path) != 0) {
        remove(temporary_metadata_path);
        remove(path);
        return CACHE_IO_ERROR;
    }
    return CACHE_OK;
}

cache_result_t cache_storage_read(const cache_storage_t *storage,
                                  const char *domain,
                                  const char *url,
                                  void **data_out,
                                  size_t *data_size_out) {
    char path[PATH_MAX];
    FILE *file;
    long file_size;
    void *data;
    cache_result_t result;

    if (data_out == NULL || data_size_out == NULL) {
        return CACHE_INVALID_ARGUMENT;
    }
    *data_out = NULL;
    *data_size_out = 0;
    result = cache_storage_path(storage, domain, url, path, sizeof(path));
    if (result != CACHE_OK) {
        return result;
    }
    result = metadata_matches(path, url);
    if (result != CACHE_OK) {
        return result;
    }
    file = fopen(path, "rb");
    if (file == NULL) {
        return errno == ENOENT ? CACHE_NOT_FOUND : CACHE_IO_ERROR;
    }
    if (fseek(file, 0, SEEK_END) != 0 || (file_size = ftell(file)) < 0 ||
        fseek(file, 0, SEEK_SET) != 0) {
        fclose(file);
        return CACHE_IO_ERROR;
    }
    /* Se reserva un byte incluso para archivos vacios para mantener un puntero valido. */
    data = malloc(file_size == 0 ? 1 : (size_t)file_size);
    if (data == NULL) {
        fclose(file);
        return CACHE_OUT_OF_MEMORY;
    }
    if (file_size != 0 && fread(data, 1, (size_t)file_size, file) != (size_t)file_size) {
        free(data);
        fclose(file);
        return CACHE_IO_ERROR;
    }
    fclose(file);
    *data_out = data;
    *data_size_out = (size_t)file_size;
    return CACHE_OK;
}

cache_result_t cache_storage_remove(const cache_storage_t *storage,
                                    const char *domain,
                                    const char *url) {
    char path[PATH_MAX];
    char metadata_file_path[PATH_MAX];
    cache_result_t result;

    result = cache_storage_path(storage, domain, url, path, sizeof(path));
    if (result != CACHE_OK) {
        return result;
    }
    if (remove(path) != 0) {
        return errno == ENOENT ? CACHE_NOT_FOUND : CACHE_IO_ERROR;
    }
    if (metadata_path(path, metadata_file_path, sizeof(metadata_file_path)) ==
        CACHE_OK) {
        remove(metadata_file_path);
    }
    return CACHE_OK;
}

cache_result_t cache_store_put(cache_index_t *index,
                               const cache_storage_t *storage,
                               const cache_entry_data_t *entry,
                               const void *data,
                               size_t data_size) {
    cache_entry_data_t indexed_entry;
    char path[PATH_MAX];
    cache_result_t result;

    if (index == NULL || storage == NULL || entry == NULL ||
        entry->domain == NULL || entry->url == NULL) {
        return CACHE_INVALID_ARGUMENT;
    }
    result = cache_storage_path(storage, entry->domain, entry->url,
                                path, sizeof(path));
    if (result != CACHE_OK) {
        return result;
    }
    indexed_entry = *entry;
    indexed_entry.file_path = path;
    indexed_entry.size_bytes = data_size;
    /* Primero se registra la entrada y se revierte si el contenido no puede persistirse. */
    result = cache_index_insert(index, &indexed_entry);
    if (result != CACHE_OK) {
        return result;
    }
    result = cache_storage_write(storage, entry->domain, entry->url,
                                 data, data_size);
    if (result != CACHE_OK) {
        cache_index_remove(index, entry->domain, entry->url);
    }
    return result;
}

cache_result_t cache_store_put_configured(cache_index_t *index,
                                          const cache_storage_t *storage,
                                          const cache_entry_data_t *entry,
                                          const void *data,
                                          size_t data_size,
                                          const cache_domain_config_t *config) {
    cache_entry_data_t victim;
    size_t domain_size;
    cache_result_t result;

    if (index == NULL || storage == NULL || entry == NULL || config == NULL ||
        entry->domain == NULL || entry->url == NULL || !valid_policy(config->policy)) {
        return CACHE_INVALID_ARGUMENT;
    }
    if (find_node(index, entry->domain, entry->url, NULL) != NULL) {
        return CACHE_ALREADY_EXISTS;
    }
    if (config->max_size_bytes != 0 && data_size > config->max_size_bytes) {
        return CACHE_LIMIT_EXCEEDED;
    }
    domain_size = cache_index_domain_size(index, entry->domain);
    while (config->max_size_bytes != 0 &&
           (domain_size > config->max_size_bytes - data_size)) {
        /* Se expulsa una entrada completa por iteracion hasta liberar espacio. */
        result = cache_index_select_victim(index, entry->domain,
                                           config->policy, &victim);
        if (result != CACHE_OK) {
            return result;
        }
        result = cache_store_remove(index, storage, victim.domain, victim.url);
        if (result != CACHE_OK) {
            return result;
        }
        domain_size = cache_index_domain_size(index, entry->domain);
    }
    return cache_store_put(index, storage, entry, data, data_size);
}

cache_result_t cache_store_get(cache_index_t *index,
                               const cache_storage_t *storage,
                               const char *domain,
                               const char *url,
                               cache_entry_data_t *entry_out,
                               void **data_out,
                               size_t *data_size_out) {
    cache_result_t result;

    if (index == NULL || storage == NULL || entry_out == NULL) {
        return CACHE_INVALID_ARGUMENT;
    }
    result = cache_index_get(index, domain, url, entry_out);
    if (result != CACHE_OK) {
        return result;
    }
    /* Una entrada vencida nunca debe servirse aunque su archivo siga presente. */
    if (cache_entry_is_expired(entry_out, time(NULL))) {
        result = cache_storage_remove(storage, domain, url);
        if (result != CACHE_OK && result != CACHE_NOT_FOUND) {
            return result;
        }
        cache_index_remove(index, domain, url);
        return CACHE_EXPIRED;
    }
    return cache_storage_read(storage, domain, url, data_out, data_size_out);
}

cache_result_t cache_store_purge_expired(cache_index_t *index,
                                         const cache_storage_t *storage,
                                         time_t now,
                                         size_t *removed_count) {
    size_t bucket;
    size_t removed = 0;

    if (index == NULL || storage == NULL || now < 0) {
        return CACHE_INVALID_ARGUMENT;
    }
    for (bucket = 0; bucket < index->bucket_count; bucket++) {
        cache_node_t *previous = NULL;
        cache_node_t *current = index->buckets[bucket];
        while (current != NULL) {
            cache_node_t *next = current->next;
            if (cache_entry_is_expired(&current->entry, now)) {
                cache_result_t result = cache_storage_remove(
                    storage, current->entry.domain, current->entry.url);
                if (result != CACHE_OK && result != CACHE_NOT_FOUND) {
                    previous = current;
                    current = next;
                    continue;
                }
                if (previous == NULL) {
                    index->buckets[bucket] = next;
                } else {
                    previous->next = next;
                }
                free_entry(&current->entry);
                free(current);
                index->entry_count--;
                removed++;
            } else {
                previous = current;
            }
            current = next;
        }
    }
    if (removed_count != NULL) {
        *removed_count = removed;
    }
    return CACHE_OK;
}

cache_result_t cache_store_remove(cache_index_t *index,
                                  const cache_storage_t *storage,
                                  const char *domain,
                                  const char *url) {
    cache_result_t result;

    if (index == NULL || storage == NULL) {
        return CACHE_INVALID_ARGUMENT;
    }
    result = cache_storage_remove(storage, domain, url);
    if (result != CACHE_OK) {
        return result;
    }
    return cache_index_remove(index, domain, url);
}