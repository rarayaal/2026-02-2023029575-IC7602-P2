CC ?= gcc
CFLAGS ?= -std=c11 -Wall -Wextra -Wpedantic -Werror -Iinclude

TEST_BINARY := build/test_cache

.PHONY: all test clean

all: test

build:
	mkdir -p build

$(TEST_BINARY): src/cache.c include/cache.h tests/test_cache.c | build
	$(CC) $(CFLAGS) src/cache.c tests/test_cache.c -o $(TEST_BINARY)

test: $(TEST_BINARY)
	./$(TEST_BINARY)

clean:
	rm -rf build