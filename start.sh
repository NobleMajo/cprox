#!/bin/bash

docker run -d \
    --restart unless-stopped \
    --name cprox \
    -p 8080:8080 \
    -e "VERBOSE=true" \
    -e "RULE_1=*.codec.coreunit.net=PROXY:codec_{-4}:80" \
    cprox