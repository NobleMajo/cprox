# CProX (deprecated)
![CI/CD](https://github.com/noblemajo/cprox/workflows/Publish/badge.svg)
![MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![typescript](https://img.shields.io/badge/dynamic/json?style=plastic&color=blue&label=Typescript&prefix=v&query=devDependencies.typescript&url=https%3A%2F%2Fraw.githubusercontent.com%2Fnoblemajo%2Fcprox%2Fmain%2Fpackage.json)
![npm](https://img.shields.io/npm/v/cprox.svg?style=plastic&logo=npm&color=red)
<!-- ![github](https://img.shields.io/badge/dynamic/json?style=plastic&color=darkviolet&label=GitHub&prefix=v&query=version&url=https%3A%2F%2Fraw.githubusercontent.com%2Fnoblemajo%2Fcprox%2Fmain%2Fpackage.json) -->

![](https://img.shields.io/badge/dynamic/json?color=green&label=watchers&query=watchers&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fcprox)
![](https://img.shields.io/badge/dynamic/json?color=yellow&label=stars&query=stargazers_count&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fcprox)
![](https://img.shields.io/badge/dynamic/json?color=navy&label=forks&query=forks&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fcprox)
<!-- ![](https://img.shields.io/badge/dynamic/json?color=orange&label=subscribers&query=subscribers_count&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fcprox)
![](https://img.shields.io/badge/dynamic/json?color=darkred&label=open%20issues&query=open_issues&suffix=x&url=https%3A%2F%2Fapi.github.com%2Frepos%2Fnoblemajo%2Fcprox) -->

CProX is an easy to configure `static serve`, `redirect`, `reverse proxy` and `load balancing` web server.

---
- [CProX](#cprox)
- [Features](#features)
- [Tested with](#tested-with)
- [Configuration](#configuration)
- [Gettings started](#gettings-started)
  - [Install](#install)
  - [Help](#help)
  - [Run](#run)
- [Contributing](#contributing)
- [License](#license)
- [Disclaimer](#disclaimer)

# Features
 - Support for `http`, `https`, `ws`, `wss` and any subprotocol.  
 - Simple `cli tool` and easy `envtionment variables`.
 - Automatically `self-signed certificate` if required (or disabled)!
 
# Tested with
 - node v16
 - npm  v8

# Configuration
Please checkout the [configuration guide](https://github.com/noblemajo/cprox/blob/main/docs/config.md).  
But here a quick example:
```sh
cprox \
    *=STATIC:/var/www/html \
    */test=STATIC:/var/www/test \
    example.com=REDIRECT:https://www.example.com \
    www.example.com=STATIC:/var/www/example \
    www.example.com/proxy=PROXY:http://127.0.0.1:58080
```

# Gettings started
Checkout the `test.sh` and the `start.sh` scripts to understand what you need to think about and how to start the server.

## Install
```sh
npm i -g cprox
```

## Help
Checkout the help output for a quit overview:
```sh
cprox -h
```

## Run
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

# Contributing
Contributions to this project are welcome!  
Interested users can refer to the guidelines provided in the [CONTRIBUTING.md](CONTRIBUTING.md) file to contribute to the project and help improve its functionality and features.

# License
This project is licensed under the [MIT license](LICENSE), providing users with flexibility and freedom to use and modify the software according to their needs.

# Disclaimer
This project is provided without warranties.  
Users are advised to review the accompanying license for more information on the terms of use and limitations of liability.
