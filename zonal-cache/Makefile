CC ?= gcc
CFLAGS ?= -std=c11 -Wall -Wextra -Wpedantic -Werror -Iinclude

TEST_BINARY := build/test_cache

.PHONY: all test check asan clean

all: test

build:
	mkdir -p build

$(TEST_BINARY): src/cache.c include/cache.h tests/test_cache.c | build
	$(CC) $(CFLAGS) src/cache.c tests/test_cache.c -o $(TEST_BINARY)

test: $(TEST_BINARY)
	./$(TEST_BINARY)

check: clean test

asan:
	$(MAKE) clean
	$(MAKE) CFLAGS="$(CFLAGS) -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer" test

clean:
	rm -rf build