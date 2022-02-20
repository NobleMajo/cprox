#!/bin/bash

CLOUDFLARE_API_TOKEN=$1

# request password input via prompt if CLOUDFLARE_API_TOKEN is empty
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    read -p "Cloudflare API token: " CLOUDFLARE_API_TOKEN
fi

echo "dns_cloudflare_api_token = $CLOUDFLARE_API_TOKEN" >> ./cloudflare.ini
chmod 770 ./cloudflare.ini

docker run -it --rm \
    --name certbot \
    -p 80:80 \
    -v "$(pwd)/cloudflare.ini:/tmp/cloudflare.ini" \
    -v "$HOME/certs:/etc/letsencrypt/archive" \
    certbot/dns-cloudflare \
        certonly \
        --email admin@coreunit.net \
        --dns-cloudflare \
        --dns-cloudflare-credentials /tmp/cloudflare.ini \
        --dns-cloudflare-propagation-seconds 20 \
        --agree-tos \
        --no-eff-email \
        -d coreunit.net \
        -d *.coreunit.net \
        -d *.codec.coreunit.net \
        -d *.i.coreunit.net

rm -rf ./cloudflare.ini
