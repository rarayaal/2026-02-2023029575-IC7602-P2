CC ?= gcc
CFLAGS ?= -Wall -Wextra -pedantic -std=c11 -O2 -Iinclude
LDLIBS ?= -lcurl
TARGET = dns-interceptor
TEST_TARGET = test_dns
SRC_DIR = src
OBJ_DIR = obj
TEST_DIR = tests

SRCS = $(filter-out $(SRC_DIR)/main.c, $(wildcard $(SRC_DIR)/*.c))
OBJS = $(patsubst $(SRC_DIR)/%.c, $(OBJ_DIR)/%.o, $(SRCS))

all: $(TARGET)

$(TARGET): $(OBJS) $(OBJ_DIR)/main.o
	$(CC) $(CFLAGS) -o $@ $^ $(LDLIBS)

$(OBJ_DIR)/main.o: $(SRC_DIR)/main.c | $(OBJ_DIR)
	$(CC) $(CFLAGS) -c $< -o $@

$(OBJ_DIR)/%.o: $(SRC_DIR)/%.c | $(OBJ_DIR)
	$(CC) $(CFLAGS) -c $< -o $@

$(OBJ_DIR):
	mkdir -p $(OBJ_DIR)

test: $(OBJS)
	$(CC) $(CFLAGS) $(TEST_DIR)/test_dns.c $(OBJS) -o $(TEST_TARGET) $(LDLIBS)
	./$(TEST_TARGET)
	rm -f $(TEST_TARGET)

clean:
	rm -rf $(OBJ_DIR) $(TARGET) $(TEST_TARGET)

.PHONY: all clean test