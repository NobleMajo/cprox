#!/bin/bash

# check if the first argument is set
if [ -z "$1" ]; then
    echo "Usage: $0 <CLOUDFLARE_API_TOKEN>"
    exit 1
fi

# check if the first argument is a minimum 20 character cloudflare api token
if [ ${#1} -lt 20 ]; then
    echo "Usage: $0 <CLOUDFLARE_API_TOKEN>"
    exit 1
fi

CLOUDFLARE_API_TOKEN=$1
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
