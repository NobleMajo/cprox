#!/bin/bash

docker rm -f cprox

docker network create codec

./build.sh

docker run -it \
    --restart unless-stopped \
    --name cprox \
    -p 80:80 \
    -p 443:443 \
    -v "$(pwd)/public:/app/public" \
    -v "$(pwd)/certs:/app/certs" \
    -e "HTTP_PORT=80" \
    -e "VERBOSE=true" \
    -e "CONTAINER_NAME_PREFFIX=codec_" \
    -e "PROXY_1=codec.coreunit.net=codec_{0}:8080" \
    -e "PROXY_2=coreunit.net=cunet_website:80" \
    --network codec \
    cprox
