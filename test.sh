#!/bin/bash

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
    -e "RULE_1=*.codec.coreunit.net=PROXY:codec_{-4}:80" \
    -e "VERBOSE=true" \
    --network codec \
    cprox

docker attach cprox