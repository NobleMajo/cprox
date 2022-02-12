// import express, compression, cors, morgan
import dns from "dns"
import env from "./env/envParser"
import HttpProxy from "http-proxy"
import http, { IncomingMessage, RequestListener, Server as HttpServer } from "http"
import https, { Server as HttpsServer } from "https"
import { createMergedProxyResolver, createProxyResolver, loadProxySettings } from "./proxySettings"
import { Duplex } from "stream"
import * as fs from "fs"
import path from "path"
import serveStatic from "serve-static"
import { ReadableStreamBYOBRequest } from "stream/web"

export type UpgradeListener = (req: http.IncomingMessage, socket: Duplex, head: Buffer) => void

console.log("CProx| Starting...")

export function resolvePath(pathString: string): string {
    if (typeof pathString != "string") {
        throw new Error("pathString must be a string and not: " + typeof pathString + ": " + pathString)
    }
    if (!pathString.startsWith("/")) {
        pathString = process.cwd() + "/" + pathString
    }
    return path.join(...pathString.split("/"))
}

dns.setServers(env.DNS_SERVER_ADDRESSES)

const resolvers = createProxyResolver(loadProxySettings())
if (resolvers.length == 0) {
    throw new Error("No proxy resolver rules found!")
}
const resolver = createMergedProxyResolver(resolvers)

const proxys: {
    [domain: string]: HttpProxy
} = {}

const prepareProxy: (req: IncomingMessage) => string | null = (req) => {
    req.method
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

var serveStaticFiles = serveStatic(
    resolvePath(env.STATIC_PATH)
)

const requestListener: RequestListener = (req, res) => {
    const hostname = prepareProxy(req)
    if (hostname) {
        proxys[hostname].web(req, res)
    }
    serveStaticFiles(req, res, () => { })
}

const upgradeListener: UpgradeListener = (req, socket, head) => {
    const hostname = prepareProxy(req)
    if (!hostname) {
        socket.destroy()
        return
    }
    proxys[hostname].ws(req, socket, head)
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

