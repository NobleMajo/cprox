# CProX
![Docker](https://img.shields.io/docker/image-size/majo418/cprox)
![CI/CD](https://github.com/majo418/cprox/workflows/Image/badge.svg)
![CI/CD](https://github.com/majo418/cprox/workflows/Publish/badge.svg)
![MIT](https://img.shields.io/badge/license-MIT-blue.svg)

![typescript](https://img.shields.io/badge/dynamic/json?style=plastic&color=blue&label=Typescript&prefix=v&query=devDependencies.typescript&url=https%3A%2F%2Fraw.githubusercontent.com%2Fmajo418%2Fcprox%2Fmain%2Fpackage.json)
![npm](https://img.shields.io/npm/v/cprox.svg?style=plastic&logo=npm&color=red)
![github](https://img.shields.io/badge/dynamic/json?style=plastic&color=darkviolet&label=GitHub&prefix=v&query=version&url=https%3A%2F%2Fraw.githubusercontent.com%2Fmajo418%2Fcprox%2Fmain%2Fpackage.json)

![](https://img.shields.io/badge/dynamic/json?color=green&label=watchers&query=watchers&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Fcprox)
![](https://img.shields.io/badge/dynamic/json?color=yellow&label=stars&query=stargazers_count&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Fcprox)
![](https://img.shields.io/badge/dynamic/json?color=orange&label=subscribers&query=subscribers_count&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Fcprox)
![](https://img.shields.io/badge/dynamic/json?color=navy&label=forks&query=forks&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Fcprox)
![](https://img.shields.io/badge/dynamic/json?color=darkred&label=open%20issues&query=open_issues&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Fcprox)

# table of contents
- [CProX](#cprox)
- [table of contents](#table-of-contents)
- [about](#about)
  - [details](#details)
- [configuration](#configuration)
  - [example](#example)
  - [guide](#guide)
- [gettings started](#gettings-started)
  - [NodeJS](#nodejs)
  - [Docker](#docker)
- [usage recommendation](#usage-recommendation)
- [references](#references)
- [contribution](#contribution)

# about
|
[Docker Hub](https://hub.docker.com/r/majo418/cprox)
|
[GitHub](https://github.com/majo418/cprox)
|  
CProX is an easy to configure `static serve`, `redirect`, `reverse proxy` and `load balancing` web server.

## details
 - Support for `http`, `https`, `ws`, `wss` and any subprotocol.  
 - Its a `free` `open source` project.
 - Available on `github.com`, `npmjs.com` and `hub.docker.com`.
 - Simple `cli tool` and easy `envtionment variables`.
 - Automatically `self-signed certificate` if required and not disabled!
 
# configuration
## example
```sh
cprox \
    *=STATIC:/var/www/html \
    */test=STATIC:/var/www/test \
    example.com=REDIRECT:https://www.example.com \
    www.example.com=STATIC:/var/www/example \
    www.example.com/proxy=PROXY:http://127.0.0.1:58080
```

## guide
Please checkout the [configuration guide](https://github.com/majo418/cprox/blob/main/docs/config.md).

# gettings started
Checkout the `test.sh` and the `start.sh` scripts to understand what you need to think about and how to start the server.

## NodeJS

### install
```sh
npm i -g cprox
```

### run
Run as redirect server:
```sh
cprox *=REDIRECT:https://start.duckduckgo.com
```
Run as static file server:
```sh
cprox *=STATIC:/var/www/html
```
Run as proxy server:
```sh
cprox *=PROXY:http://127.0.0.1:8080
```
Cli tool help output:
```sh
cprox -h
```

## Docker

### requirements
 - docker cli
 - Linus distribution

### pull
```sh
docker pull majo418/cprox:latest
```

### run
```sh
docker run -it --rm \
  -p 80:80 \
  -p 443:443 \
  -v $(pwd)/certs:/app/certs \
  majo418/cprox \
    *=REDIRECT:https://start.duckduckgo.com
```
### help
```sh
docker run -it --rm majo418/cprox -h
```

### help output
```css
# CPROX #

Usage: cprox [OPTIONS] COMMAND [ARGUMENTS]

CProX is a easy to configure redirect, proxy and static webserver

Options:
  -v, --verbose                                  Show basic flag adn target informations (default: 'false', ENV: 'VERBOSE')
      --dry-run                                  Exit cprox before final start server step. (default: 'false', ENV: 'DRYRUN')
  -p, --http-port [number]                       Set the http port (default: 80 but disabled if any port is set) (default: '80', ENV: 'HTTP_PORT')
  -s, --https-port [number]                      Set the https port (default: 443 but disabled if any port is set) (default: '443', ENV: 'HTTPS_PORT')
  -t, --trust-all-certs                          Trust all certificates on proxy (default: 'false', ENV: 'TRUST_ALL_CERTS')
  -b, --bind-host-address [string]               Set the host where the server pind the ports (default: '0.0.0.0', ENV: 'BIND_ADDRESS')
      --disable-self-singed                      Disable generating self singed certificates if not exist (default: 'false', ENV: 'DISABLE_SELF_SINGED')
      --self-singed-country-code [string]        Set the country code for the self singed certificate (default: 'INT', ENV: 'SELF_SINGED_COUNTRY_CODE')
      --self-singed-common-domain-name [string]  Set the common domain name for the self singed certificate (default: 'example.com', ENV: 'SELF_SINGED_COMMON_DOMAIN_NAME')
      --self-singed-state-name [string]          Set the state name for the self singed certificate (default: 'International', ENV: 'SELF_SINGED_STATE_NAME')
      --self-singed-locality-name [string]       Set the locality name for the self singed certificate (default: 'International', ENV: 'SELF_SINGED_LOCALITY_NAME')
      --self-singed-organization-name [string]   Set the organization name for the self singed certificate (default: 'None', ENV: 'SELF_SINGED_ORGANIZATION_NAME')
      --self-singed-email-address [string]       Set the email address for the self singed certificate (default: 'none@example.com', ENV: 'SELF_SINGED_EMAIL_ADDRESS')
      --self-singed-netscape-comment [string]    Set the netscape comment for the self singed certificate (default: 'Self-Singed SSL Certificate by the CProX Server Software', ENV: 'SELF_SINGED_NETSCAPE_COMMENT')
      --dns-server-address [string]              Add a dns address to the existing dns addresses (default: '127.0.0.11,1.0.0.1,8.8.4.4,1.1.1.1,8.8.8.8', ENV: 'DNS_SERVER_ADDRESSES')
      --cert-path [string]                       Define the path for the certificates (default: './certs', ENV: 'CERT_PATH')
      --cert-name [string]                       Define the name for the certificates cert file (default: 'cert.pem', ENV: 'CERT_NAME')
      --key-name [string]                        Define the name for the certificates key file (default: 'privkey.pem', ENV: 'KEY_NAME')
      --ca-name [string]                         Define the name for the certificate ca file (default: 'chain.pem', ENV: 'CA_NAME')
  -r, --rule [string]                            CProX rules
      --max-header-size [number | string]        Define the maximum request header size (default: 1024 * 4) (default: '4096', ENV: 'MAX_HEADER_SIZE')
      --connection-timeout [number | string]     Define the maximum time in miliseconds (or as millisecond calucaltion) for a open conneciton (default: '15000', ENV: 'CONNECTION_TIMEOUT')
      --proxy-reaction-timeout [number | string] Define the maximum time in miliseconds (or as millisecond calucaltion) that the proxy target has to respond (default: '3000', ENV: 'PROXY_REACTION_TIMEOUT')
      --proxy-verify-certificate                 Proxy verify target certificates (default: 'false', ENV: 'PROXY_VERIFY_CERTIFICATE')
      --proxy-follow-redirects                   Proxy follow redirects (default: 'false', ENV: 'PROXY_FOLLOW_REDIRECTS')
  -h, --help                                     Shows this help output

Commands:
version Shows the version of cprox

Details:
You can use CProX as webserver. It can proxy, redirect and service static content on requests

! CProX | by majo418 | supported by CoreUnit.NET !
```

# usage recommendation
Running the program under different conditions might work, have unpredictable effects, or might work only partially or not at all.  
The program was tested under the following conditions:
 - node.js v16
 - npm v8
 - ubuntu 20.04

# references
 - [configuration](https://github.com/majo418/cprox/blob/main/docs/config.md).
 - [npm scripts](https://github.com/majo418/cprox/blob/main/docs/npm.md).

# contribution
 - 1. fork the project
 - 2. implement your idea
 - 3. create a pull/merge request
```ts
// please create seperated forks for different kind of featues/ideas/structure changes/implementations
```

---
**cya ;3**  
*by majo418*



