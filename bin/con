#!/bin/bash

if ! [[ "$1" =~ ^[0-9]+$ ]] || [ "$1" -lt "1" ] || [ "$1" -gt "65535" ]; then
    echo "Error: $1 is not a valid port number."
    exit 1
fi

CURRENT_WORK_DIR=$(pwd)
CURRENT_SCRIPT=$(realpath $0)
CURRENT_SCRIPT_DIR=$(dirname $CURRENT_SCRIPT)
PROJECT_DIR="$CURRENT_SCRIPT_DIR/.."
PROJECT_NAME=$(node -e "console.log(require('$PROJECT_DIR/package.json').name)")

cd $PROJECT_DIR
docker build -t $PROJECT_NAME .

docker rm -f $PROJECT_NAME > /dev/null 2>&1

cd $CURRENT_WORK_DIR
docker run --rm -it \
    -p 0.0.0.0:$1:443 \
    -v $PROJECT_DIR/certs:/app/certs \
    -v $CURRENT_WORK_DIR:/mount \
    --name $PROJECT_NAME \
    $PROJECT_NAME \
        -s 443 ${@:2}