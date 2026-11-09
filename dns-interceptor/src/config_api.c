#include "config_api.h"

#include <curl/curl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define CONFIG_API_MAX_BODY (64 * 1024)
#define CONFIG_API_TIMEOUT_SECONDS 3L

int config_api_parse_domains(const char *json, domain_list_t *out) {
  if (!json || !out)
    return -1;
  out->count = 0;

  const char *key = strstr(json, "\"domains\"");
  if (!key)
    return -1;
  const char *p = strchr(key, '[');
  if (!p)
    return -1;
  p++;

  while (*p && *p != ']') {
    if (*p != '"') {
      p++;
      continue;
    }
    const char *start = ++p;
    while (*p && *p != '"')
      p++;
    if (!*p)
      return -1; /* Cadena sin cerrar */

    size_t len = (size_t)(p - start);
    if (len > 0 && len < MAX_DOMAIN_LEN && out->count < MAX_DOMAINS) {
      memcpy(out->names[out->count], start, len);
      out->names[out->count][len] = '\0';
      out->count++;
    }
    p++;
  }
  return *p == ']' ? 0 : -1;
}

typedef struct {
  char *data;
  size_t len;
} body_t;

static size_t write_body(char *ptr, size_t size, size_t nmemb, void *userdata) {
  body_t *body = userdata;
  size_t chunk = size * nmemb;
  if (body->len + chunk >= CONFIG_API_MAX_BODY)
    return 0; /* Respuesta demasiado grande: aborta la transferencia */
  memcpy(body->data + body->len, ptr, chunk);
  body->len += chunk;
  body->data[body->len] = '\0';
  return chunk;
}

int config_api_fetch_domains(const char *api_url, const char *token,
                             domain_list_t *out) {
  if (!api_url || !token || !out)
    return -1;

  char url[512];
  char auth[512];
  snprintf(url, sizeof(url), "%s/api/internal/domains", api_url);
  snprintf(auth, sizeof(auth), "Authorization: Bearer %s", token);

  body_t body = {.data = calloc(CONFIG_API_MAX_BODY, 1), .len = 0};
  CURL *curl = curl_easy_init();
  if (!body.data || !curl) {
    free(body.data);
    if (curl)
      curl_easy_cleanup(curl);
    return -1;
  }

  struct curl_slist *headers = curl_slist_append(NULL, auth);
  curl_easy_setopt(curl, CURLOPT_URL, url);
  curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
  curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_body);
  curl_easy_setopt(curl, CURLOPT_WRITEDATA, &body);
  curl_easy_setopt(curl, CURLOPT_TIMEOUT, CONFIG_API_TIMEOUT_SECONDS);

  long status = 0;
  CURLcode res = curl_easy_perform(curl);
  if (res == CURLE_OK)
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &status);

  int result = -1;
  if (res != CURLE_OK) {
    fprintf(stderr, "[DNS Interceptor] Error consultando dominios al API: %s\n",
            curl_easy_strerror(res));
  } else if (status != 200) {
    fprintf(stderr, "[DNS Interceptor] El API respondió HTTP %ld al pedir dominios\n",
            status);
  } else {
    result = config_api_parse_domains(body.data, out);
  }

  curl_slist_free_all(headers);
  curl_easy_cleanup(curl);
  free(body.data);
  return result;
}
