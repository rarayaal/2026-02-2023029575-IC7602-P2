#define _GNU_SOURCE
#include "http_util.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>

int match_url_pattern(const char *pattern, const char *text) {
    if (!pattern || !text) return 0;

    while (*pattern && *text) {
        if (*pattern == '*') {
            while (*pattern == '*') pattern++;
            if (*pattern == '\0') {
                return 1;
            }
            while (*text) {
                if (match_url_pattern(pattern, text)) {
                    return 1;
                }
                text++;
            }
            return 0;
        } else if (*pattern == *text) {
            pattern++;
            text++;
        } else {
            return 0;
        }
    }

    while (*pattern == '*') pattern++;
    return (*pattern == '\0' && *text == '\0');
}

void parse_http_request(const char *buffer, HTTPRequest *req) {
    memset(req, 0, sizeof(HTTPRequest));

    // Método y Path
    sscanf(buffer, "%15s %511s", req->method, req->path);

    // Host
    const char *host_header = strcasestr(buffer, "\nHost:");
    if (!host_header && strncasecmp(buffer, "Host:", 5) == 0) {
        host_header = buffer - 1;
    }
    if (host_header) {
        host_header = strchr(host_header, ':');
        if (host_header) {
            host_header++;
            while (*host_header == ' ') host_header++;
            int i = 0;
            while (*host_header != '\r' && *host_header != '\n' && *host_header != '\0' && *host_header != ':' && i < 127) {
                req->host[i++] = *host_header++;
            }
            req->host[i] = '\0';
        }
    }

    // x-api-key
    const char *key_header = strcasestr(buffer, "x-api-key:");
    if (key_header) {
        key_header += strlen("x-api-key:");
        while (*key_header == ' ') key_header++;
        int i = 0;
        while (*key_header != '\r' && *key_header != '\n' && *key_header != '\0' && i < 127) {
            req->api_key[i++] = *key_header++;
        }
        req->api_key[i] = '\0';
    }

    // Cookie: zc_session=...
    const char *cookie_header = strcasestr(buffer, "Cookie:");
    if (cookie_header) {
        const char *session_key = strstr(cookie_header, "zc_session=");
        if (session_key) {
            session_key += strlen("zc_session=");
            int i = 0;
            while (*session_key != ';' && *session_key != '\r' && *session_key != '\n' && *session_key != '\0' && i < 127) {
                req->cookie_session[i++] = *session_key++;
            }
            req->cookie_session[i] = '\0';
        }
    }
}
