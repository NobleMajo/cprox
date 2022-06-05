#!/bin/bash

CURRENT_WORK_DIR=$(pwd)
CURRENT_SCRIPT=$(realpath $0)
CURRENT_SCRIPT_DIR=$(dirname $CURRENT_SCRIPT)
PROJECT_DIR="$CURRENT_SCRIPT_DIR/.."
PROJECT_NAME=$(node -e "console.log(require('$PROJECT_DIR/package.json').name)")

docker rm -f testrun > /dev/null 2>&1

cd $PROJECT_DIR
docker create -it \
    --name testrun \
    --entrypoint "/bin/sh" \
    node:16-alpine \
        -c "cd /app && npm ci && npm run test"

docker cp $PROJECT_DIR testrun:/app

docker start -ai \
    testrun