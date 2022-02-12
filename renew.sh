#!/bin/bash

docker run -it --rm \
    --name certbot \
    -v "/etc/letsencrypt:/etc/letsencrypt" \
    -v "$(pwd)/certs:/etc/letsencrypt/archive" \
    certbot/certbot \
        certonly \
        --webroot \
        -w /webroot \
        -d coreunit.net \
        -m admin@coreunit.net \
        --agree-tos \
        --no-eff-email
