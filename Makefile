SRC = $(wildcard src/*.es)
LIB = $(SRC:src/%.es=lib/%.js)

all: lib

lib: $(LIB)
lib/%.js: src/%.es
	mkdir -p $(@D)
	babel $< -o $@
