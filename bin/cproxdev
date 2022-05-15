#!/bin/bash

CURRENT_SCRIPT=$(realpath $0)
CURRENT_SCRIPT_DIR=$(dirname $CURRENT_SCRIPT)
PROJECT_DIR="$CURRENT_SCRIPT_DIR/.."
TSNODE_BIN="$PROJECT_DIR/node_modules/.bin/ts-node"
INDEX_TS="$PROJECT_DIR/src/index.ts"

$TSNODE_BIN \
    $INDEX_TS \
    $@
