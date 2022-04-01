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
- [gettings started](#gettings-started)
  - [requirements](#requirements)
  - [run with docker](#run-with-docker)
- [configuration](#configuration)
  - [environment variables](#environment-variables)
  - [rules](#rules)
    - [types](#types)
      - [redirect](#redirect)
      - [static](#static)
      - [proxy](#proxy)
    - [other examples](#other-examples)
    - [set rules](#set-rules)
    - [variables](#variables)
    - [variable mapping](#variable-mapping)
    - [wildcards in variables](#wildcards-in-variables)
    - [use variables](#use-variables)
    - [examples](#examples)
- [examples](#examples-1)
  - [static example](#static-example)
  - [big example](#big-example)
- [npm scripts](#npm-scripts)
  - [use](#use)
  - [base scripts](#base-scripts)
  - [watch mode](#watch-mode)
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

# gettings started
Checkout the `test.sh` and the `start.sh` scripts to understand what you need to think about and how to start the server.

## requirements
 - Docker
 - Linus distribution

## run with docker
```sh
dockerrun -it --rm \
    -p 80:80 \
    -p 443:443 \
    -e "RULE_1=*=REDIRECT:https://start.duckduckgo.com"
    majo418/cprox
```

# configuration
You configure the server via rules and environment variables.
## environment variables
[https://github.com/majo418/cprox/blob/main/src/env/env.ts](https://github.com/majo418/cprox/blob/main/src/env/env.ts)
## rules
A rule is a key value pair as string that can be set over 
the environment variables or via the cli process arguments.

Its containers the origin target, rule type and rule target:  
`<origin>=<type>:<target>`

### types
#### redirect
The following rule all requests to the host `example.com` on the path `/test` to `https://youtube.com`:
```md
example.com/test=REDIRECT:https://youtube.com
```

The following rule redirects all requests on the path `/redirect` to `https://hub.docker.com`:
```md
*/redirect=REDIRECT:https://hub.docker.com
```

#### static
The following rule provides the static content of the `/var/www/html` folder as website if `example.com` is the host address:
```md
example.com=STATIC:/var/www/html
```

#### proxy
The following rule forward `localhost` to `http://localhost:8080`:
```md
localhost=PROXY:localhost:8080
```

The following rule forward `auth.coreunit.net` to a keycloak docker container in the same network that not publish a port:
```md
auth.coreunit.net=PROXY:keycloak:8080
```

### other examples
 - localhost/youtube=REDIRECT:https://youtube.com/
 - *.localhost=REDIRECT:https://duckduckgo.com/?t=vivaldi&ia=web&q={-2}
 - localhost=STATIC:./public

### set rules
Just pass the rules as arguments to the process:
```sh
dockerrun \
    (...) \
    majo418/cprox \
        <rule1> \
        <rule2> \
        <rule3>
```
Or via environment variables via `RULE_<n>` where `<n>` is the rule number:
```sh
dockerrun \
    (...) \
    -e "RULE_1=<rule1>" \ 
    -e "RULE_2=<rule2>" \
    -e "RULE_3=<rule3>" \
    majo418/cprox
```
### variables
The rules support variables.  
A variables is always a number that is never 0.  
Numbers greater than 0 represent a part of the requested path splitted by `/`.  
Numbers lesser than 0 represent a part of the requested domain splitted by `.`.  

### variable mapping
If the requested address is `test.coreunit.net/test/test2/test3` you can get the following variables:
 - `{-3}` = "test"
 - `{-2}` = "coreunit"
 - `{-1}` = "net"
 - `{1}` = "test"
 - `{2}` = "test2"
 - `{3}` = "test3"

### wildcards in variables
That also works with wildcards!
If the requested address is `*.test.coreunit.net` you can get the following variables:
 - `{-4}` = <the wildcard value>
 - `{-3}` = "test"
 - `{-2}` = "coreunit"
 - `{-1}` = "net"

### use variables
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


### examples
Here some rule examples:
```sh
 - "localhost/youtube=REDIRECT:https://youtube.com/"
 - "*.localhost=REDIRECT:https://duckduckgo.com/?q={-2}"
 - "localhost=STATIC:./public"
 - "localhost/test=STATIC:./dist"
 - "*.cprox.coreunit.net=PROXY:cprox_{-4}:8080"
 - "*.test.i.coreunit.net=PROXY:test_{-4}"
 - "coreunit.net=STATIC:/var/www/main"
 - "auth.coreunit.net=PROXY:keycloak_container:8080"
 - "majo.coreunit.net=REDIRECT:https://github.com/majo418"
 - "sysdev.coreunit.net=REDIRECT:https://github.com/sysdev"
 - "cprox.coreunit.net=STATIC:/var/www/cprox"
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

# npm scripts
The npm scripts are made for linux but can also work on mac and windows.
## use
You can run npm scripts in the project folder like this:
```sh
npm run <scriptname>
```
Here is an example:
```sh
npm run test
```

## base scripts
You can find all npm scripts in the `package.json` file.
This is a list of the most important npm scripts:
 - test // test the app
 - build // build the app
 - exec // run the app
 - start // build and run the app

## watch mode
Like this example you can run all npm scripts in watch mode:
```sh
npm run start:watch
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



