# CProX
[![](https://img.shields.io/docker/image-size/majo418/cprox)](https://hub.docker.com/r/majo418/cprox)
![CI](https://github.com/majo418/cprox/workflows/Image/badge.svg)
![MIT](https://img.shields.io/badge/license-MIT-blue.svg)

![](https://img.shields.io/badge/dynamic/json?color=darkred&label=Issues&query=open_issues&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Fcprox)
![](https://img.shields.io/badge/dynamic/json?color=navy&label=Forks&query=forks&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Fcprox)
![](https://img.shields.io/badge/dynamic/json?color=green&label=Subscribers&query=subscribers_count&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fmajo418%2Fcprox)

# table of contents
- [CProX](#cprox)
- [table of contents](#table-of-contents)
- [about](#about)
- [configuration](#configuration)
    - [examples](#examples)
  - [arguments](#arguments)
    - [container example](#container-example)
    - [node example](#node-example)
  - [variables](#variables)
    - [examples](#examples-1)
    - [use](#use)
- [gettings started](#gettings-started)
  - [requirements](#requirements)
  - [pull the image](#pull-the-image)
  - [(or) build the image locally](#or-build-the-image-locally)
  - [run the container](#run-the-container)
- [environment variables](#environment-variables)
  - [rules](#rules)
    - [examples](#examples-2)
- [examples](#examples-3)
  - [static example](#static-example)
  - [big example](#big-example)
- [contribution](#contribution)

# about
|
[Docker Hub](https://hub.docker.com/r/majo418/cprox)
|
[GitHub](https://github.com/majo418/cprox)
|  
CProX is easy customizable static, redirct and proxy server.
```sh
docker pull majo418/cprox:latest
```

# configuration
You configure the server via rules.  
A rule is a key value pair as string that that can be set over the environment variables or via the cli process arguments.

### examples
```sh
RULE_1="localhost/youtube=REDIRECT:https://youtube.com/"
RULE_2="*.localhost=REDIRECT:https://duckduckgo.com/?t=vivaldi&ia=web&q={-2}"
RULE_3="localhost=STATIC:./public"
```

## arguments
Just pass the rules as arguments to the process.
```sh
cprox <rule1> <rule2> <rule3> ...
```

### container example
```sh
docker run -it --rm --name cprox (...) majo418/cprox "localhost=STATIC:./public"
```

### node example
```sh
node ./dist/index.js "localhost=STATIC:./public"
```

## variables
The rules support variables.  
A variables is always a number that is never 0.  
Numbers greater than 0 represent a part of the requested path splitted by `/`.  
Numbers lesser than 0 represent a part of the requested domain splitted by `.`.  

### examples
If the requested address is `test.coreunit.net/test/test2/test3` you can get the following variables:
 - `{-3}` = "test"
 - `{-2}` = "coreunit"
 - `{-1}` = "net"
 - `{1}` = "test"
 - `{2}` = "test2"
 - `{3}` = "test3"

That also works with wildcards!
If the requested address is `*.test.coreunit.net` you can get the following variables:
 - `{-4}` = <the wildcard value>
 - `{-3}` = "test"
 - `{-2}` = "coreunit"
 - `{-1}` = "net"

### use
You can use the variables in the value part of the rules like that:  
`*.localhost=REDIRECT:https://duckduckgo.com/?q={-2}`  
If you request `some_test.localhost` you will get redirected to `https://duckduckgo.com/?q=some_test`.

Same with paths:  
`localhost/*=REDIRECT:https://duckduckgo.com/?q={1}`  
If you request `localhost/some_value` you will get redirected to `https://duckduckgo.com/?q=some_value`.

That also works with proxy and static rules!  
Here is a example with docker containers:  
`*.con.localhost=PROXY:c_{-3}:8080`  
If you request `mynginx.con.localhost` the request get proxied to `c_mynginx:8080`.

# gettings started
Checkout the `test.sh` and the `start.sh` scripts to understand what you need to think about and how to start the server.

## requirements
 - Docker
 - Linus distribution

## pull the image
```sh
docker pull majo418/cprox
```
## (or) build the image locally
```sh
./build.sh
```

## run the container
```sh
./start.sh
```

# environment variables
[https://github.com/majo418/cprox/blob/main/src/env/env.ts](https://github.com/majo418/cprox/blob/main/src/env/env.ts)

## rules
To set a rule, you can set the environment variable `RULE_<n>` where `<n>` is the rule number.

### examples
Here some rule examples:
```sh
 - "localhost/youtube=REDIRECT:https://youtube.com/"
 - "*.localhost=REDIRECT:https://duckduckgo.com/?q={-2}"
 - "localhost=STATIC:./public"
 - "localhost/test=STATIC:./dist"
 - "*.codec.coreunit.net=PROXY:codec_{-4}:8080"
 - "*.test.i.coreunit.net=PROXY:test_{-4}"
 - "coreunit.net=STATIC:/var/www/main"
 - "auth.coreunit.net=PROXY:keycloak_container:8080"
 - "majo.coreunit.net=REDIRECT:https://github.com/majo418"
 - "sysdev.coreunit.net=REDIRECT:https://github.com/sysdev"
 - "codec.coreunit.net=STATIC:/var/www/codec"
 - "i.coreunit.net=STATIC:/var/www/intern"
 - "i.coreunit.net/certs=STATIC:/home/netde/certs"
 - "discord.coreunit.net=REDIRECT:https://discord.gg/pwHNaHRa9W"
 - "teamspeak.coreunit.net=REDIRECT:ts3server://coreunit.net"
 - "github.coreunit.net=REDIRECT:https://github.com/coreunitnet"
 - "/.well-known=STATIC:/home/netde/certs/.well-known"
 - "/test=STATIC:/home/netde/certs/.well-known"
 - "/qweqwesdsdddsdsdsdsde=STATIC:/home/netde/certs/.well-known"
```

# examples

## static example
```sh
docker run -it --rm \
    --name cprox \
    -e "RULE_1=stat.coreunit.net=STATIC:/var/www/html" \
    -v /var/www/html:/var/www/html \
    -p 8443:443 \
    majo418/cprox
```

## big example
```sh
docker run -it --rm \
    --name cprox \
    -e "VERBOSE=true" \
    -e "PRODUCTION=true" \
    -e "RULE_1=static.test.net=STATIC:/var/www/html" \
    -e "RULE_2=redirect.test.net=REDIRECT:http://target.test2.net" \
    -e "RULE_1=proxy.test.net=PROXY:http://my.target.test2.net:8080" \
    -e "SELF_SINGED_DOMAIN=test.net" \ # -e "SELF_SINGED_IF_NEEDED=false" to disable self singed certs
    -e "CERT_PATH=/app/certs/pub.pem" \
    -e "KEY_PATH=/app/certs/key.pem" \
    -e "CA_PATH=/app/certs/chain.pem" \
    -v "/var/www/html:/var/www/html" \
    -v "/home/certs:/app/certs" \
    -p 443:443 \
    -p 80:80 \
    majo418/cprox
```

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




