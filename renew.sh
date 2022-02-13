#!/bin/bash

rm -rf $(pwd)/certs/coreunit.net

docker run -it --rm \
    --name certbot \
    -v "$(pwd)/certs:/etc/letsencrypt/archive" \
    -v "$(pwd)/public:/webroot" \
    certbot/certbot \
        certonly \
        --webroot \
        -w /webroot \
        -d coreunit.net \
        -d *.coreunit.net \
        --manual \
        --dns-nsone \
        --dns-nsone-credentials \
        --preferred-challenges=dns \
        --agree-tos \
        --no-eff-email
