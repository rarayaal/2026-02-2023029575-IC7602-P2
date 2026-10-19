#include "cache.h"

#include <stdlib.h>
#include <string.h>

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