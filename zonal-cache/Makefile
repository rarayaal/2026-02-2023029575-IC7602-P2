CC ?= gcc
CFLAGS ?= -std=c11 -Wall -Wextra -Wpedantic -Iinclude
LDFLAGS ?= -pthread -lcurl

TEST_BINARY := build/test_cache
TEST_T10_BINARY := build/test_t10
TEST_CONCURRENCY_BINARY := build/test_concurrency
TEST_SECURITY_BINARY := build/test_security
SERVER_BINARY := build/zonal_cache_server


.PHONY: all server test test-t10 test-concurrency test-security clean

all: server test test-t10 test-concurrency test-security

build:
	mkdir -p build

server: $(SERVER_BINARY)

$(SERVER_BINARY): src/server.c src/http_util.c src/cache.c src/config_client.c | build
	$(CC) $(CFLAGS) src/server.c src/http_util.c src/cache.c src/config_client.c -o $(SERVER_BINARY) $(LDFLAGS)

$(TEST_BINARY): src/cache.c include/cache.h tests/test_cache.c | build
	$(CC) $(CFLAGS) src/cache.c tests/test_cache.c -o $(TEST_BINARY)

$(TEST_T10_BINARY): src/http_util.c include/http_util.h tests/test_t10_matching.c | build
	$(CC) $(CFLAGS) src/http_util.c tests/test_t10_matching.c -o $(TEST_T10_BINARY)

$(TEST_CONCURRENCY_BINARY): src/cache.c include/cache.h tests/test_concurrency.c | build
	$(CC) $(CFLAGS) src/cache.c tests/test_concurrency.c -o $(TEST_CONCURRENCY_BINARY) -pthread

$(TEST_SECURITY_BINARY): src/server.c src/http_util.c src/cache.c src/config_client.c tests/test_security.c | build
	$(CC) $(CFLAGS) src/http_util.c src/cache.c src/config_client.c tests/test_security.c -o $(TEST_SECURITY_BINARY) $(LDFLAGS)

test-t10: $(TEST_T10_BINARY)
	./$(TEST_T10_BINARY)

test-concurrency: $(TEST_CONCURRENCY_BINARY)
	./$(TEST_CONCURRENCY_BINARY)

test-security: $(TEST_SECURITY_BINARY)
	./$(TEST_SECURITY_BINARY)

test: $(TEST_BINARY) test-t10 test-concurrency test-security
	./$(TEST_BINARY)

check: clean test

asan:
	$(MAKE) clean
	$(MAKE) CFLAGS="$(CFLAGS) -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer" test

clean:
	rm -rf build