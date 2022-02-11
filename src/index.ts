// import express, compression, cors, morgan
import dns from "dns"
import env from "./env/envParser"
import HttpProxy, { createProxyServer } from "http-proxy"
import http, { IncomingMessage, OutgoingMessage } from "http"

dns.setServers([
    "127.0.0.11",
    "1.1.1.1",
    "8.8.8.8",
    "1.0.0.1",
    "8.8.4.4"
])

const proxys: {
    [domain: string]: HttpProxy
} = {}

const prepareProxy: (req: IncomingMessage) => string = (req) => {
    // get request hostname by headers host
    let hostname = req.headers.host
    env.VERBOSE && console.log(" - VERBOSE: request from host: " + hostname)
    // thorw error if hostname is not defined
    if (!hostname) {
        throw new Error("No hostname ('host') defined in headers!")
    }
    if (hostname?.includes(":")) {
        hostname = hostname.split(":")[0]
    }
    if (
        hostname.length <= env.ORIGIN_HOST.length ||
        !hostname.endsWith(env.ORIGIN_HOST)
    ) {
        throw new Error("Origin host needs to be a subdomain of '" + originHost + "'!")
    }
    hostname = hostname.slice(0, -(env.ORIGIN_HOST.length + 1)).toLowerCase()
    if (hostname.length === 0) {
        throw new Error("Origin host subdomain '" + env.ORIGIN_HOST + "' needs to be greater than 0!")
    }
    env.VERBOSE && console.log(
        " - VERBOSE: result container address:\n" +
        "   " + env.CONTAINER_NAME_PREFIX + hostname + env.CONTAINER_NAME_SUFFIX + ":" + env.CONTAINER_PORT
    )

    // cache proxy middleware in expressProxyMiddlewares
    if (!proxys[hostname]) {
        proxys[hostname] = new HttpProxy({
            target: {
                host: env.CONTAINER_NAME_PREFIX + hostname + env.CONTAINER_NAME_SUFFIX,
                port: env.CONTAINER_PORT
            }
        })
    }

    return hostname
}

const httpServer = http.createServer(function (req, res) {
    const hostname = prepareProxy(req)
    proxys[hostname].web(req, res)
});

httpServer.on('upgrade', function (req, socket, head) {
    const hostname = prepareProxy(req)
    proxys[hostname].ws(req, socket, head)
});

httpServer.listen(env.PORT, env.BIND_ADDRESS, () => {
    console.log(`CProx started on port ${env.PORT}!`)
})




