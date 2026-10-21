#include "cache.h"

#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static cache_entry_data_t sample_entry(void) {
    cache_entry_data_t entry = {
        .domain = "example.com",
        .url = "/index.html",
        .file_path = "/tmp/zonal-cache/example.com/index.html",
        .file_type = "html",
        .size_bytes = 128,
        .created_at = 100,
        .expires_at = 200,
        .last_accessed_at = 100,
        .access_count = 0,
        .insertion_order = 0
    };
    return entry;
}

int main(void) {
    cache_index_t *index = cache_index_create(2);
    cache_entry_data_t entry = sample_entry();
    cache_entry_data_t result;

    assert(index != NULL);
    assert(cache_index_size(index) == 0);
    assert(cache_index_insert(index, &entry) == CACHE_OK);
    assert(cache_index_size(index) == 1);
    assert(cache_index_insert(index, &entry) == CACHE_ALREADY_EXISTS);
    assert(cache_index_get(index, "example.com", "/index.html", &result) == CACHE_OK);
    assert(strcmp(result.domain, "example.com") == 0);
    assert(strcmp(result.url, "/index.html") == 0);
    assert(result.insertion_order == 1);
    assert(cache_index_touch(index, "example.com", "/index.html", 150) == CACHE_OK);
    assert(cache_index_get(index, "example.com", "/index.html", &result) == CACHE_OK);
    assert(result.last_accessed_at == 150);
    assert(result.access_count == 1);
    entry.size_bytes = 256;
    entry.expires_at = 300;
    assert(cache_index_update(index, &entry) == CACHE_OK);
    assert(cache_index_get(index, "example.com", "/index.html", &result) == CACHE_OK);
    assert(result.size_bytes == 256);
    assert(result.expires_at == 300);
    assert(result.insertion_order == 1);
    assert(cache_index_get(index, "missing.com", "/none", &result) == CACHE_NOT_FOUND);
    assert(cache_index_remove(index, "example.com", "/index.html") == CACHE_OK);
    assert(cache_index_remove(index, "example.com", "/index.html") == CACHE_NOT_FOUND);
    assert(cache_index_size(index) == 0);
    cache_index_destroy(index);

    index = cache_index_create(2);
    cache_storage_t *storage = cache_storage_create("build/cache-test");
    const char content[] = "contenido de prueba\n";
    void *loaded = NULL;
    size_t loaded_size = 0;

    assert(index != NULL);
    assert(storage != NULL);
    entry = sample_entry();
    assert(cache_store_put(index, storage, &entry, content,
                           sizeof(content) - 1) == CACHE_OK);
    assert(cache_store_get(index, storage, entry.domain, entry.url, &result,
                           &loaded, &loaded_size) == CACHE_OK);
    assert(loaded_size == sizeof(content) - 1);
    assert(memcmp(loaded, content, loaded_size) == 0);
    assert(strstr(result.file_path, "build/cache-test/example.com/") != NULL);
    free(loaded);
    assert(cache_store_remove(index, storage, entry.domain, entry.url) == CACHE_OK);
    assert(cache_store_get(index, storage, entry.domain, entry.url, &result,
                           &loaded, &loaded_size) == CACHE_NOT_FOUND);
    cache_storage_destroy(storage);
    cache_index_destroy(index);
    puts("Todas las pruebas del indice pasaron.");
    return 0;
}