#!/bin/bash

docker run -d \
    --restart unless-stopped \
    --name cprox \
    -p 8080:8080 \
    -v "$(pwd)/certs/coreunit.net:/app/certs" \
    -e "VERBOSE=true" \
    -e "ORIGIN_HOST_PREFIX=coreunit.net" \
    -e "CONTAINER_NAME_PREFFIX=codec_" \
    -e "PROXY_1=*.codec.coreunit.net=PROXY:codec_{-4}:80" \
    cprox