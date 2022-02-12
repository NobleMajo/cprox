// import express, compression, cors, morgan
import dns from "dns"
import env from "./env/envParser"
import HttpProxy from "http-proxy"
import http, { IncomingMessage, OutgoingMessage, RequestListener, Server as HttpServer, ServerResponse } from "http"
import https, { Server as HttpsServer } from "https"
import { createMergedProxyResolver, createProxyResolver, loadProxySettings } from "./proxySettings"
import { Duplex } from "stream"
import * as fs from "fs"
import path from "path"
import serveStatic, { RequestHandler } from "serve-static"
import { loadStaticSettings, StaticRules } from "./staticSettings"

export type UpgradeListener = (req: http.IncomingMessage, socket: Duplex, head: Buffer) => void

console.log("CProx| Starting...")

export function resolvePath(pathString: string): string {
    if (typeof pathString != "string") {
        throw new Error("pathString must be a string and not: " + typeof pathString + ": " + pathString)
    }
    if (!pathString.startsWith("/")) {
        pathString = process.cwd() + "/" + pathString
    }
    return "/" + path.join(...pathString.split("/"))
}

dns.setServers(env.DNS_SERVER_ADDRESSES)

let staticRules: StaticRules = {}
let staticRuleKeys: string[] = []
loadStaticSettings(
    "STATIC_",
    false
)
    .then((rules) => {
        staticRules = rules
        staticRuleKeys = Object.keys(rules)
            .sort(
                (a, b) => a.length - b.length
            )
        env.VERBOSE && console.log("Verbose| Static file rules:\n", rules)
    })
const proxySettings = loadProxySettings()
env.VERBOSE && console.log("Verbose| Proxy rules:\n", proxySettings)
const resolvers = createProxyResolver(proxySettings)
if (resolvers.length == 0) {
    throw new Error("No proxy resolver rules found!")
}
const resolver = createMergedProxyResolver(resolvers)

const proxys: {
    [domain: string]: HttpProxy
} = {}

const prepareProxy: (req: IncomingMessage) => string | null = (req) => {
    // get request hostname by headers host
    let hostname = req.headers.host
    env.VERBOSE && console.log(" - VERBOSE: request from host: " + hostname)
    // thorw error if hostname is not defined
    if (!hostname) {
        return null
    }
    if (hostname?.includes(":")) {
        hostname = hostname.split(":")[0]
    }

    const rule = resolver(hostname)
    if (!rule) {
        return null
    }

    // cache proxy middleware in expressProxyMiddlewares
    if (!proxys[hostname]) {
        proxys[hostname] = new HttpProxy({
            target: {
                host: rule[0],
                port: rule[1],
            }
        })
    }

    return hostname
}

var maunelServeStaticMiddlewares: {
    [path: string]: RequestHandler<ServerResponse>
} = {}

const prepareStaticServe: (req: IncomingMessage) => string | null = (req) => {
    for (let index = 0; index < staticRuleKeys.length; index++) {
        if (req.url?.startsWith(staticRuleKeys[index])) {
            const reqPath = staticRuleKeys[index]
            maunelServeStaticMiddlewares[reqPath] = serveStatic(
                resolvePath(staticRules[reqPath])
            )
            return reqPath
        }
    }
    return null
}

var serveStaticFiles: RequestHandler<ServerResponse> = serveStatic(
    resolvePath(env.STATIC_PATH)
)


const requestListener: RequestListener = (req, res) => {
    try {
        let key = prepareStaticServe(req)
        if (key) {
            maunelServeStaticMiddlewares[key](req, res, () => { })
            return
        }
        key = prepareProxy(req)
        if (key) {
            proxys[key].web(req, res)
        }
        serveStaticFiles(req, res, () => { })
    } catch (err) {
        res.statusCode = 500
        res.end()
        console.error(err)
    }
}

const upgradeListener: UpgradeListener = (req, socket, head) => {
    try {
        let key
        key = prepareProxy(req)
        if (key) {
            proxys[key].ws(req, socket, head)
            return
        }
        socket.destroy()
    } catch (err: Error | any) {
        console.error(err)
        socket.destroy(err)
    }
}

let httpServer: HttpServer | null = null
let httpsServer: HttpsServer | null = null
let restartPromise: Promise<void> | null = null

const restart: () => Promise<void> = async () => {
    if (restartPromise) {
        restartPromise = restartPromise.then(() => start())
        return
    }
    const p = restartPromise = start()
    await p
    if (restartPromise == p) {
        restartPromise = null
    }
}

const start: () => Promise<void> = async () => {
    console.log("------------------------------------------------------")
    console.log("CProx| Load https key and certificate...")
    // read cert file async in promse
    const certPromise = new Promise<string>(
        (res, rej) =>
            fs.readFile(
                resolvePath(env.CERT_PATH),
                { encoding: "utf-8" },
                (err, data) =>
                    err ? rej(err) : res(data.toString())
            )
    )
    const keyPromise = new Promise<string>(
        (res, rej) =>
            fs.readFile(
                resolvePath(env.KEY_PATH),
                { encoding: "utf-8" },
                (err, data) =>
                    err ? rej(err) : res(data.toString())
            )
    )
    const caPromise = new Promise<string>(
        (res, rej) =>
            fs.readFile(
                resolvePath(env.CA_PATH),
                { encoding: "utf-8" },
                (err, data) =>
                    err ? rej(err) : res(data.toString())
            )
    )

    const cert = await certPromise
    const key = await keyPromise
    const ca = await caPromise

    // if httpServer is not null, then close is in a promise and resolve if after the callback
    if (httpServer || httpsServer) {
        console.log("CProx| Closing old server...")
        const httpClosePromsie = new Promise<void>(
            (res, rej) =>
                httpServer ?
                    httpServer.close(
                        (err) =>
                            err ? rej(err) : res()
                    ) :
                    res()
        )
        const httpsClosePromsie = new Promise<void>(
            (res, rej) =>
                httpsServer ?
                    httpsServer.close(
                        (err) =>
                            err ? rej(err) : res()
                    ) :
                    res()
        )
        await httpClosePromsie
        await httpsClosePromsie
    }

    console.log("CProx| Create new servers...")
    //start http and https server
    httpsServer = https.createServer(
        {
            cert: cert,
            key: key,
        },
        requestListener
    )
    httpServer = http.createServer(
        {

        },
        requestListener
    )

    httpsServer.on('upgrade', upgradeListener)
    httpServer.on('upgrade', upgradeListener)

    console.log("CProx| Start new servers...")
    const httpsStartPromise = new Promise<HttpsServer>(
        (res, rej) => {
            if (httpsServer) {
                try {
                    const server = httpsServer.listen(
                        env.HTTPS_PORT,
                        env.BIND_ADDRESS,
                        () => res(server),

                    )
                } catch (err) {
                    rej(err)
                }
            }
        }
    )
    const httpStartPromise = new Promise<HttpServer>(
        (res, rej) => {
            if (httpServer) {
                try {
                    const server = httpServer.listen(
                        env.HTTP_PORT,
                        env.BIND_ADDRESS,
                        () => res(server),
                    )
                } catch (err) {
                    rej(err)
                }
            }
        }
    )

    await httpsStartPromise
    await httpStartPromise

    console.log(`CProx| https started on port ${env.HTTPS_PORT}!`)
    console.log(`CProx| http started on port ${env.HTTP_PORT}!`)
}

fs.watch(
    resolvePath(env.CERT_PATH),
    (event) =>
        event == "change" ? restart() : null
)
fs.watch(
    resolvePath(env.KEY_PATH),
    (event) =>
        event == "change" ? restart() : null
)
fs.watch(
    resolvePath(env.CA_PATH),
    (event) =>
        event == "change" ? restart() : null
)

restart()

