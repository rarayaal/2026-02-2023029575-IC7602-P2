#ifndef ZONAL_CACHE_HTTP_H
#define ZONAL_CACHE_HTTP_H

#include <stddef.h>

typedef struct {
    char method[16];
    char path[512];
    char host[128];
    char api_key[128];
    char cookie_session[128];
} HTTPRequest;

int match_url_pattern(const char *pattern, const char *text);
void parse_http_request(const char *buffer, HTTPRequest *req);

#endif
