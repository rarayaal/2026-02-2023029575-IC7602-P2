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
    cache_ttl_rule_t ttl_rules[] = {
        {.file_type = "html", .ttl_seconds = 60},
        {.file_type = "png", .ttl_seconds = 3600}
    };
    cache_ttl_config_t ttl_config = {
        .rules = ttl_rules,
        .rule_count = 2,
        .default_ttl_seconds = 30
    };
    cache_entry_data_t ttl_entry = sample_entry();
    size_t removed_count = 0;
    cache_entry_data_t victim;

    assert(cache_index_create(0) == NULL);
    assert(cache_index_size(NULL) == 0);
    assert(cache_index_insert(NULL, NULL) == CACHE_INVALID_ARGUMENT);
    assert(cache_index_get(NULL, NULL, NULL, NULL) == CACHE_INVALID_ARGUMENT);
    assert(cache_index_remove(NULL, NULL, NULL) == CACHE_INVALID_ARGUMENT);
    assert(cache_index_touch(NULL, NULL, NULL, 0) == CACHE_INVALID_ARGUMENT);
    assert(cache_index_purge_expired(NULL, 0, NULL) == CACHE_INVALID_ARGUMENT);
    assert(cache_storage_create(NULL) == NULL);
    assert(cache_storage_path(NULL, NULL, NULL, NULL, 0) == CACHE_INVALID_ARGUMENT);
    assert(cache_ttl_expiration(NULL, "html", 100) == 0);
    assert(cache_entry_is_expired(NULL, 100) == 0);

    assert(cache_ttl_expiration(&ttl_config, "html", 100) == 160);
    assert(cache_ttl_expiration(&ttl_config, "css", 100) == 130);
    assert(cache_entry_is_expired(&ttl_entry, 199) == 0);
    assert(cache_entry_is_expired(&ttl_entry, 200) == 1);
    ttl_entry.expires_at = 0;
    assert(cache_entry_is_expired(&ttl_entry, 100000) == 0);

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
    assert(index != NULL);
    assert(cache_index_select_victim(index, "missing.com", CACHE_POLICY_LRU,
                                     &victim) == CACHE_NOT_FOUND);
    assert(cache_index_select_victim(index, "missing.com", CACHE_POLICY_RANDOM,
                                     &victim) == CACHE_NOT_FOUND);
    assert(cache_index_select_victim(index, "missing.com", (cache_policy_t)99,
                                     &victim) == CACHE_INVALID_ARGUMENT);
    assert(cache_index_domain_size(index, "missing.com") == 0);
    assert(cache_index_purge_expired(index, 100, &removed_count) == CACHE_OK);
    assert(removed_count == 0);
    cache_index_destroy(index);

    cache_entry_data_t policy_one = sample_entry();
    cache_entry_data_t policy_two = sample_entry();
    cache_entry_data_t policy_three = sample_entry();
    policy_one.url = "/one";
    policy_two.url = "/two";
    policy_three.url = "/three";
    index = cache_index_create(2);
    assert(index != NULL);
    assert(cache_index_insert(index, &policy_one) == CACHE_OK);
    assert(cache_index_insert(index, &policy_two) == CACHE_OK);
    assert(cache_index_insert(index, &policy_three) == CACHE_OK);
    assert(cache_index_touch(index, "example.com", "/one", 10) == CACHE_OK);
    assert(cache_index_touch(index, "example.com", "/two", 20) == CACHE_OK);
    assert(cache_index_touch(index, "example.com", "/two", 21) == CACHE_OK);
    assert(cache_index_touch(index, "example.com", "/three", 30) == CACHE_OK);
    assert(cache_index_touch(index, "example.com", "/three", 31) == CACHE_OK);
    assert(cache_index_touch(index, "example.com", "/three", 32) == CACHE_OK);
    assert(cache_index_select_victim(index, "example.com", CACHE_POLICY_LRU,
                                     &victim) == CACHE_OK);
    assert(strcmp(victim.url, "/one") == 0);
    assert(cache_index_select_victim(index, "example.com", CACHE_POLICY_MRU,
                                     &victim) == CACHE_OK);
    assert(strcmp(victim.url, "/three") == 0);
    assert(cache_index_select_victim(index, "example.com", CACHE_POLICY_LFU,
                                     &victim) == CACHE_OK);
    assert(strcmp(victim.url, "/one") == 0);
    assert(cache_index_select_victim(index, "example.com", CACHE_POLICY_FIFO,
                                     &victim) == CACHE_OK);
    assert(strcmp(victim.url, "/one") == 0);
    srand(7);
    assert(cache_index_select_victim(index, "example.com", CACHE_POLICY_RANDOM,
                                     &victim) == CACHE_OK);
    assert(strcmp(victim.domain, "example.com") == 0);
    cache_index_destroy(index);

    index = cache_index_create(2);
    cache_storage_t *storage = cache_storage_create("build/cache-test");
    const char content[] = "contenido de prueba\n";
    void *loaded = NULL;
    size_t loaded_size = 0;

    assert(index != NULL);
    assert(storage != NULL);
    assert(cache_storage_path(storage, "../escape", "/bad", (char[16]){0}, 16) ==
           CACHE_INVALID_ARGUMENT);
    assert(cache_storage_path(storage, "example.com", "/bad", (char[2]){0}, 2) ==
           CACHE_BUFFER_TOO_SMALL);
    assert(cache_storage_write(storage, "example.com", "/empty", NULL, 0) == CACHE_OK);
    assert(cache_storage_read(storage, "example.com", "/empty", &loaded,
                              &loaded_size) == CACHE_OK);
    assert(loaded != NULL);
    assert(loaded_size == 0);
    free(loaded);
    assert(cache_storage_read(storage, "example.com", "/missing", &loaded,
                              &loaded_size) == CACHE_NOT_FOUND);

    {
        char collision_path[4096];
        char collision_metadata_path[4096];
        FILE *collision_file;

        assert(cache_storage_path(storage, "example.com", "/collision",
                                  collision_path, sizeof(collision_path)) == CACHE_OK);
        snprintf(collision_metadata_path, sizeof(collision_metadata_path),
                 "%s.url", collision_path);
        collision_file = fopen(collision_path, "wb");
        assert(collision_file != NULL);
        assert(fputs("contenido original", collision_file) >= 0);
        assert(fclose(collision_file) == 0);
        collision_file = fopen(collision_metadata_path, "wb");
        assert(collision_file != NULL);
        assert(fputs("/otra-url\n", collision_file) >= 0);
        assert(fclose(collision_file) == 0);
        assert(cache_storage_write(storage, "example.com", "/collision",
                                   "nuevo", 5) == CACHE_HASH_COLLISION);
        remove(collision_path);
        remove(collision_metadata_path);
    }
    entry = sample_entry();
    entry.expires_at = 0;
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

    ttl_entry = sample_entry();
    ttl_entry.expires_at = 100;
    ttl_entry.url = "/expired.html";
    assert(cache_store_put(index, storage, &ttl_entry, content,
                           sizeof(content) - 1) == CACHE_OK);
    assert(cache_store_get(index, storage, ttl_entry.domain, ttl_entry.url,
                           &result, &loaded, &loaded_size) == CACHE_EXPIRED);
    assert(cache_index_size(index) == 0);

    ttl_entry.url = "/expired-again.html";
    assert(cache_store_put(index, storage, &ttl_entry, content,
                           sizeof(content) - 1) == CACHE_OK);
    assert(cache_store_purge_expired(index, storage, 100, &removed_count) == CACHE_OK);
    assert(removed_count == 1);
    assert(cache_index_size(index) == 0);
    cache_storage_destroy(storage);
    cache_index_destroy(index);

    index = cache_index_create(2);
    storage = cache_storage_create("build/cache-limit-test");
    cache_domain_config_t domain_config = {
        .max_size_bytes = 10,
        .policy = CACHE_POLICY_FIFO
    };
    cache_entry_data_t limited_one = sample_entry();
    cache_entry_data_t limited_two = sample_entry();
    limited_one.url = "/limited-one";
    limited_two.url = "/limited-two";
    assert(index != NULL);
    assert(storage != NULL);
    assert(cache_store_put_configured(index, storage, &limited_one, "123456", 6,
                                      &domain_config) == CACHE_OK);
    assert(cache_index_domain_size(index, "example.com") == 6);
    assert(cache_store_put_configured(index, storage, &limited_two, "12345", 5,
                                      &domain_config) == CACHE_OK);
    assert(cache_index_size(index) == 1);
    assert(cache_index_get(index, "example.com", "/limited-one", &result) ==
           CACHE_NOT_FOUND);
    assert(cache_index_get(index, "example.com", "/limited-two", &result) == CACHE_OK);
    assert(cache_index_domain_size(index, "example.com") == 5);
    assert(cache_store_put_configured(index, storage, &limited_one,
                                      "12345678901", 11, &domain_config) ==
           CACHE_LIMIT_EXCEEDED);
    assert(cache_store_put_configured(index, storage, &limited_two, "x", 1,
                                      &domain_config) == CACHE_ALREADY_EXISTS);
    cache_storage_destroy(storage);
    cache_index_destroy(index);
    puts("Todas las pruebas del indice pasaron.");
    return 0;
}