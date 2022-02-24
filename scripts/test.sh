#!/bin/bash

cd ..

docker network create codec

docker rm -f cprox

./build.sh

docker run -d \
    --restart unless-stopped \
    --name cprox \
    -p 80:80 \
    -p 443:443 \
    -v "$HOME/static/main:/var/www/html" \
    -v "$HOME/certs/coreunit.net:/app/certs" \
    -e "CERT_PATH=/app/certs/cert1.pem" \
    -e "KEY_PATH=/app/certs/privkey1.pem" \
    -e "CA_PATH=/app/certs/fullchain1.pem" \
    -e "RULE_4=*.codec.coreunit.net=PROXY:codec_{-4}:8080" \
    -e "RULE_3=sysdev.coreunit.net=REDIRECT:https://github.com/PhoenixRaph" \
    -e "RULE_2=majo.coreunit.net=REDIRECT:https://github.com/majo418" \
    -e "RULE_1=coreunit.net=STATIC:/var/www/html" \
    -e "VERBOSE=true" \
    --network codec \
    cprox
