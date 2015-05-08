SRC = $(wildcard src/*.es6)
LIB = $(SRC:src/%.es6=lib/%.js)

all: lib

lib: $(LIB)
lib/%.js: src/%.es6
	mkdir -p $(@D)
	babel $< -o $@
