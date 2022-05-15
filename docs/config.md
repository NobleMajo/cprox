# configuration
You configure the server with variables and rules.
That config is adjustable via environment variables or the cli.

# table of contents
- [configuration](#configuration)
- [table of contents](#table-of-contents)
- [references](#references)
- [cli](#cli)
- [environment variables](#environment-variables)
- [rules](#rules)
- [rule order](#rule-order)
  - [set rules in docker](#set-rules-in-docker)
  - [set rules for cli tool](#set-rules-for-cli-tool)
- [rule types](#rule-types)
  - [redirect](#redirect)
  - [static](#static)
  - [proxy](#proxy)
  - [other examples](#other-examples)
- [rule variables](#rule-variables)
  - [variable mapping](#variable-mapping)
  - [wildcards in variables](#wildcards-in-variables)
  - [use variables](#use-variables)
  - [examples](#examples)
- [Load balancing](#load-balancing)
  - [Define targets](#define-targets)
  - [Redirect](#redirect-1)
  - [Proxy](#proxy-1)
- [examples](#examples-1)
  - [static example](#static-example)
  - [big example](#big-example)
- [references](#references-1)

# references
 - [getting started](https://github.com/majo418/cprox/blob/main/README.md#gettings-started)
 - [npm scripts](https://github.com/majo418/cprox/blob/main/docs/npm.md).
 

# cli
This is the output of the `cprox -h` cli command.
You can overwrite the default environment varaible values by using the flags.
The none flag arugments are the cprox rules.
```md
# CPROX #

Usage: cprox [OPTIONS] [ARGUMENTS]

CProX is a easy to configure redirect, proxy and static webserver.

Options:
  -v, --verbose                                  Show basic flag adn target informations.
  -p, --http-port [number]                       Set the http port (default: 80 but disabled if any port is set)
  -s, --https-port [number]                      Set the https port (default: 443 but disabled if any port is set)
  -t, --trust-all-certs                          Trust all certificates on proxy.
  -b, --bind-host-address [string]               Set the host where the server pind the ports.
      --disable-self-singed                      Disable generating self singed certificates if not exist.
  -d, --self-singed-domain [string]              Set the domain name for self singed certificates.
      --dns-server-address [string]              Add a dns address to the existing dns addresses.
      --cert-path [string]                       Define the path for the certificates.
      --cert-name [string]                       Define the name for the certificates cert file.
      --key-name [string]                        Define the name for the certificates key file.
      --ca-name [string]                         Define the name for the certificate ca file.
  -r, --rule [string]                            CProX rules
      --request-timeout [number | string]        Define the maximum time in miliseconds (or as millisecond calucaltion) for the request content.
      --connection-timeout [number | string]     Define the maximum time in miliseconds (or as millisecond calucaltion) for a open conneciton.
      --proxy-reaction-timeout [number | string] Define the maximum time in miliseconds (or as millisecond calucaltion) that the proxy target has to respond.
      --proxy-verify-certificate                 Proxy verify target certificates
      --proxy-follow-redirects                   Proxy follow redirects
  -h, --help                                     Shows this help output

Details:
You can use CProX as webserver. It can proxy, redirect and service static content on requests.

! CProX | by majo418 | supported by CoreUnit.NET !
```

# environment variables
The environment variables configure the webserver settings like http port, https port, certificat path, certificat name and bound host address.
The default values can be overwriten by the cli tool flags. 
You can find the adjustable environment variables here:
[https://github.com/majo418/cprox/blob/main/src/env/env.ts](https://github.com/majo418/cprox/blob/main/src/env/env.ts)

# rules
A rule is a key value pair as string that can be set over 
the environment variables or via the cli process arguments.

Its containers the origin target, rule type and rule target:  
`<origin>=<type>:<target>`

# rule order
CProX automatically sort the rules by this order:
 - host parts ("." as seperator)
if equal 
 - host part size
if equal 
 - rule insert order (environemtn varaibles first)

## set rules in docker
Just pass the rules as arguments to the process:
```sh
docker run -p 80:80 majo418/cprox <rule1> <rule2> <rule3>
```
Or via environment variables via `RULE_<n>` where `<n>` is the rule number:
```sh
docker run \
    -p 80:80 \
    -e "RULE_1=<rule1>" \ 
    -e "RULE_2=<rule2>" \
    -e "RULE_3=<rule3>" \
    majo418/cprox
```

## set rules for cli tool
Just pass the rules as arguments to the process:
```sh
cprox <rule1> <rule2> <rule3>
```
Or via environment variables via `RULE_<n>` where `<n>` is the rule number:
```sh
export RULE_1="<rule1>"
export RULE_1="<rule2>"
export RULE_1="<rule3>"
cprox
```

# rule types
## redirect
The following rule all requests to the host `example.com` on the path `/test` to `https://youtube.com`:
```md
example.com/test=REDIRECT:https://youtube.com
```

The following rule redirects all requests on the path `/redirect` to `https://hub.docker.com`:
```md
*/redirect=REDIRECT:https://hub.docker.com
```

## static
The following rule provides the static content of the `/var/www/html` folder as website if `example.com` is the host address:
```md
example.com=STATIC:/var/www/html
```

## proxy
The following rule forward `localhost` to `http://localhost:8080`:
```md
localhost=PROXY:localhost:8080
```

The following rule forward `auth.coreunit.net` to a keycloak docker container in the same network that not publish a port:
```md
auth.coreunit.net=PROXY:keycloak:8080
```

## other examples
 - localhost/youtube=REDIRECT:https://youtube.com/
 - *.localhost=REDIRECT:https://duckduckgo.com/?t=vivaldi&ia=web&q={-2}
 - localhost=STATIC:./public

# rule variables
The rules support variables.  
A variables is always a number that is never 0.  
Numbers greater than 0 represent a part of the requested path splitted by `/`.  
Numbers lesser than 0 represent a part of the requested domain splitted by `.`.  

## variable mapping
If the requested address is `test.coreunit.net/test/test2/test3` you can get the following variables:
 - `{-3}` = "test"
 - `{-2}` = "coreunit"
 - `{-1}` = "net"
 - `{1}` = "test"
 - `{2}` = "test2"
 - `{3}` = "test3"

## wildcards in variables
That also works with wildcards!
If the requested address is `*.test.coreunit.net` you can get the following variables:
 - `{-4}` = <the wildcard value>
 - `{-3}` = "test"
 - `{-2}` = "coreunit"
 - `{-1}` = "net"

## use variables
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

## examples
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

# Load balancing
A feature of CProX is load balancing.
This is available for `REDIRECT` and `PROXY` rules.

## Define targets
You define multiple load balancer targets using commas.  
Example:
```
*=REDIRECT:https://start.duckduckgo.com,https://startpage.com,https://google.de
```

## Redirect
If you define multiple targets in a `REDIRECT` rule, CProx will use the available targets alternately.  
Example:
```
*=REDIRECT:https://start.duckduckgo.com,https://startpage.com,https://google.de
```

Response Location header example:
1. Location: https://start.duckduckgo.com
2. Location: https://startpage.com
3. Location: https://google.de
4. Location: https://start.duckduckgo.com

## Proxy
If you define multiple targets in a `PROXY` rule, CProx will use the available targets alternately.
**But**, if there are still open proxy connections, CProX will use the least used target for new incomming request.
Example:
```
*=PROXY:http://127.0.0.1:8080,http://127.0.0.1:8081,http://127.0.0.1:8082
```

Request proxy target example:
1. Open: http://127.0.0.1:8080
2. Open: http://127.0.0.1:8081
3. Open: http://127.0.0.1:8082
4. Open: http://127.0.0.1:8080
5. Open: http://127.0.0.1:8081
7. Close: http://127.0.0.1:8081
8. Close: http://127.0.0.1:8081
9. Open: http://127.0.0.1:8081
10. Open: http://127.0.0.1:8081

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

# references
 - [getting started](https://github.com/majo418/cprox/blob/main/README.md#gettings-started)
 - [npm scripts](https://github.com/majo418/cprox/blob/main/docs/npm.md).
 