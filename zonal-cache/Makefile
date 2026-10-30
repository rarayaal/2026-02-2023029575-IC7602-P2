CC ?= gcc
CFLAGS ?= -std=c11 -Wall -Wextra -Wpedantic -Iinclude
LDFLAGS ?= -pthread -lcurl

TEST_BINARY := build/test_cache
TEST_T10_BINARY := build/test_t10
SERVER_BINARY := build/zonal_cache_server


.PHONY: all server test test-t10 clean

all: server test test-t10

build:
	mkdir -p build

server: $(SERVER_BINARY)

$(SERVER_BINARY): src/server.c src/http_util.c src/cache.c src/config_client.c | build
	$(CC) $(CFLAGS) src/server.c src/http_util.c src/cache.c src/config_client.c -o $(SERVER_BINARY) $(LDFLAGS)



$(TEST_BINARY): src/cache.c include/cache.h tests/test_cache.c | build
	$(CC) $(CFLAGS) src/cache.c tests/test_cache.c -o $(TEST_BINARY)

$(TEST_T10_BINARY): src/http_util.c include/http_util.h tests/test_t10_matching.c | build
	$(CC) $(CFLAGS) src/http_util.c tests/test_t10_matching.c -o $(TEST_T10_BINARY)

test-t10: $(TEST_T10_BINARY)
	./$(TEST_T10_BINARY)

test: $(TEST_BINARY) test-t10
	./$(TEST_BINARY)

check: clean test

asan:
	$(MAKE) clean
	$(MAKE) CFLAGS="$(CFLAGS) -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer" test

clean:
	rm -rf build