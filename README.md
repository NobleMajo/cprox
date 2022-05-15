# CProX
![Docker](https://img.shields.io/docker/image-size/majo418/cprox)
![CI/CD](https://github.com/majo418/cprox/workflows/Image/badge.svg)
![MIT](https://img.shields.io/badge/license-MIT-blue.svg)

![](https://img.shields.io/badge/dynamic/json?color=green&label=watchers&query=watchers&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Fcprox)
![](https://img.shields.io/badge/dynamic/json?color=yellow&label=stars&query=stargazers_count&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Fcprox)
![](https://img.shields.io/badge/dynamic/json?color=orange&label=subscribers&query=subscribers_count&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Fcprox)
![](https://img.shields.io/badge/dynamic/json?color=navy&label=forks&query=forks&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Fcprox)
![](https://img.shields.io/badge/dynamic/json?color=darkred&label=open%20issues&query=open_issues&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Fcprox)

# table of contents
- [CProX](#cprox)
- [table of contents](#table-of-contents)
- [about](#about)
- [configuration](#configuration)
- [gettings started](#gettings-started)
  - [NodeJS](#nodejs)
  - [Docker](#docker)
- [references](#references)
- [contribution](#contribution)

# about
|
[Docker Hub](https://hub.docker.com/r/majo418/cprox)
|
[GitHub](https://github.com/majo418/cprox)
|  
CProX is an easy configure static serve, redirct, proxy and load balancing web server.

# configuration
Please checkout the [configuration guide](https://github.com/majo418/cprox/blob/main/docs/config.md).

# gettings started
Checkout the `test.sh` and the `start.sh` scripts to understand what you need to think about and how to start the server.

## NodeJS
### requirements
 - node v16
 - Linus distrubotion

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
Help:
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
Help:
```sh
docker run -it --rm majo418/cprox -h
```

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



