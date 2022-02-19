^#!/bin/bash

docker rm -f cprox

docker network create codec

./build.sh

docker run -d \
    --restart unless-stopped \
    --name cprox \
    -p 80:80 \
    -p 443:443 \
    -v "$(pwd)/public:/app/public" \
    -v "$(pwd)/certs/coreunit.net:/app/certs" \
    -e "CERT_PATH=/app/certs/cert1.pem" \
    -e "KEY_PATH=/app/certs/privkey1.pem" \
    -e "CA_PATH=/app/certs/fullchain1.pem" \
    -e "IGNORE_EMPTY_CERT=true" \
    -e "VERBOSE=true" \
    -e "STATIC_1=/.well-known=/app/public" \
    -e "PROXY_1=codec.coreunit.net=codec_{0}:8080" \
    -e "PROXY_2=coreunit.net=cunet_website:80" \
    --network codec \
    cprox
