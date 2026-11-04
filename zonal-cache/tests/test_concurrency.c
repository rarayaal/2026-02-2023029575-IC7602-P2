#include "cache.h"

#include <assert.h>
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

#define NUM_THREADS 8
#define ITERATIONS_PER_THREAD 25
#define TEST_ROOT "/tmp/test_zc_concurrency"

static cache_index_t *shared_index = NULL;
static cache_storage_t *shared_storage = NULL;
static pthread_mutex_t shared_mutex = PTHREAD_MUTEX_INITIALIZER;

typedef struct {
    int thread_id;
    int success_count;
} worker_args_t;

static void *worker_thread(void *arg) {
    worker_args_t *args = (worker_args_t *)arg;

    cache_domain_config_t dom_cfg = {
        .max_size_bytes = 10 * 1024 * 1024,
        .policy = CACHE_POLICY_LRU
    };

    char content[128];
    char url[128];

    for (int i = 0; i < ITERATIONS_PER_THREAD; i++) {
        snprintf(url, sizeof(url), "/item_%d_%d.html", args->thread_id, i);
        snprintf(content, sizeof(content), "Thread %d iteration %d content payload", args->thread_id, i);
        size_t content_len = strlen(content);

        time_t now = time(NULL);
        cache_entry_data_t entry = {
            .domain = "concurrent.local",
            .url = url,
            .file_path = NULL,
            .file_type = "html",
            .size_bytes = content_len,
            .created_at = now,
            .expires_at = now + 60,
            .last_accessed_at = now,
            .access_count = 1,
            .insertion_order = 0
        };

        // 1. Escritura concurrente protegida con mutex
        pthread_mutex_lock(&shared_mutex);
        cache_result_t put_res = cache_store_put_configured(shared_index, shared_storage,
                                                            &entry, content, content_len,
                                                            &dom_cfg);
        pthread_mutex_unlock(&shared_mutex);
        assert(put_res == CACHE_OK);

        // 2. Lectura concurrente protegida con mutex
        void *data_out = NULL;
        size_t size_out = 0;
        cache_entry_data_t read_entry;

        pthread_mutex_lock(&shared_mutex);
        cache_result_t get_res = cache_store_get(shared_index, shared_storage,
                                                 "concurrent.local", url,
                                                 &read_entry, &data_out, &size_out);
        pthread_mutex_unlock(&shared_mutex);

        assert(get_res == CACHE_OK);
        assert(data_out != NULL);
        assert(size_out == content_len);
        assert(memcmp(data_out, content, content_len) == 0);

        free(data_out);
        args->success_count++;
    }

    return NULL;
}

int main(void) {
    printf("[Test P-02] Iniciando prueba de concurrencia del índice y almacenamiento...\n");

    // Asegurar directorio temporal limpio
    system("rm -rf " TEST_ROOT);
    mkdir(TEST_ROOT, 0755);

    shared_index = cache_index_create(256);
    assert(shared_index != NULL);

    shared_storage = cache_storage_create(TEST_ROOT);
    assert(shared_storage != NULL);

    pthread_t threads[NUM_THREADS];
    worker_args_t thread_args[NUM_THREADS];

    for (int t = 0; t < NUM_THREADS; t++) {
        thread_args[t].thread_id = t;
        thread_args[t].success_count = 0;
        int rc = pthread_create(&threads[t], NULL, worker_thread, &thread_args[t]);
        assert(rc == 0);
    }

    for (int t = 0; t < NUM_THREADS; t++) {
        pthread_join(threads[t], NULL);
        assert(thread_args[t].success_count == ITERATIONS_PER_THREAD);
    }

    size_t total_entries = cache_index_size(shared_index);
    size_t expected_entries = NUM_THREADS * ITERATIONS_PER_THREAD;
    assert(total_entries == expected_entries);

    printf("✓ Concurrencia validada: %d hilos realizaron %d operaciones seguras sin colisión.\n",
           NUM_THREADS, (int)expected_entries);

    cache_index_destroy(shared_index);
    cache_storage_destroy(shared_storage);
    system("rm -rf " TEST_ROOT);

    printf("Todos los tests de concurrencia pasaron exitosamente (P-02 resuelto).\n");
    return 0;
}

