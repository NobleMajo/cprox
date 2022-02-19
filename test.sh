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
    -v "$HOME/certs/coreunit.net:/app/certs" \
    -e "CERT_PATH=/app/certs/cert1.pem" \
    -e "KEY_PATH=/app/certs/privkey1.pem" \
    -e "CA_PATH=/app/certs/fullchain1.pem" \
    -e "RULE_1=*.codec.coreunit.net=PROXY:codec_{-4}:8080" \
    -e "RULE_2=sysdev.coreunit.net=REDIRECT:https://github.com/PhoenixRaph" \
    -e "RULE_3=majo.coreunit.net=REDIRECT:https://github.com/majo418" \
    -e "RULE_4=coreunit.net=STATIC:$HOME/web/main" \
    -e "VERBOSE=true" \
    --network codec \
    cprox

docker attach cprox
