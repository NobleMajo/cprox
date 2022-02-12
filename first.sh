#!/bin/bash

docker run -it --rm \
    --name certbot \
    -p 80:80 \
    -v "$(pwd)/certs:/etc/letsencrypt/archive" \
    certbot/certbot \
        certonly \
        --standalone \
        -d coreunit.net \
        -m admin@coreunit.net \
        --agree-tos \
        --no-eff-email
