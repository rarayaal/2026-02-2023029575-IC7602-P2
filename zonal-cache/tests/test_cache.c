#include "cache.h"

#include <assert.h>
#include <stdio.h>
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
    puts("Todas las pruebas del indice pasaron.");
    return 0;
}