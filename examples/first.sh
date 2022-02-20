#!/bin/bash

rm -rf $(pwd)/certs/coreunit.net

echo "dns_cloudflare_api_token = $API_TOKEN" >> ./cloudflare.ini
chmod 770 ./cloudflare.ini

docker run -it --rm \
    --name certbot \
    -p 80:80 \
    -v "$(pwd)/cloudflare.ini:/tmp/cloudflare.ini" \
    -v "$(pwd)/certs:/etc/letsencrypt/archive" \
    certbot/dns-cloudflare \
        certonly \
        --email admin@coreunit.net \
        --dns-cloudflare \
        --dns-cloudflare-credentials /tmp/cloudflare.ini \
        --dns-cloudflare-propagation-seconds 15 \
        --agree-tos \
        --no-eff-email \
        -d coreunit.net \
        -d *.coreunit.net \
        -d *.codec.coreunit.net \
        -d *.i.coreunit.net

rm -rf ./cloudflare.ini
