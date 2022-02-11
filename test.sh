#!/bin/bash

docker rm -f cprox

docker network create codec

./build.sh

docker run -d \
    --restart unless-stopped \
    --name cprox \
    -p 80:8080 \
    -e "VERBOSE=true" \
    -e "ORIGIN_HOST_PREFIX=codec.coreunit.net" \
    -e "CONTAINER_NAME_PREFFIX=codec_" \
    --network codec \
    cprox
