#!/bin/bash

CURRENT_WORK_DIR=$(pwd)
CURRENT_SCRIPT=$(realpath $0)
CURRENT_SCRIPT_DIR=$(dirname $CURRENT_SCRIPT)
PROJECT_DIR="$CURRENT_SCRIPT_DIR/.."
PROJECT_NAME=$(node -e "console.log(require('$PROJECT_DIR/package.json').name)")

echo "Build if not already done..."
$CURRENT_SCRIPT_DIR/build.sh > /dev/null 2>&1

echo "Remove old container if exist..."
docker rm -f testrun > /dev/null 2>&1

cd $CURRENT_WORK_DIR
docker run --rm -d \
    --name testrun \
    $PROJECT_NAME \
        -s 443 *=STATIC:/app