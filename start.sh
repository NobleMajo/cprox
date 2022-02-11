#!/bin/bash

docker run -d \
    --restart unless-stopped \
    --name cprox \
    -p 8080:8080 \
    -e "VERBOSE=true" \
    -e "ORIGIN_HOST_PREFIX=coreunit.net"
    -e "CONTAINER_NAME_PREFFIX=codec_" \
    --network cprox \
    cprox
