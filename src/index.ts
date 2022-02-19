// import express, compression, cors, morgan
import dns from "dns"
import env from "./env/envParser"
import { RequestListener, Server as HttpServer } from "http"
import { Server as HttpsServer } from "https"
import { createCertWatcher, fixPath, loadCerts } from "./certs"
import { loadRawRules, parseRules, sortRules } from "./Rule"
import { createResolvers, findResolver, ResolverCache } from "./Resolver"
import { createHttpServer, createHttpsServer, UpgradeListener } from "./server"

console.log("CProx| Init...")

dns.setServers(env.DNS_SERVER_ADDRESSES)

const certPaths = {
    cert: fixPath(env.CERT_PATH),
    key: fixPath(env.KEY_PATH),
    ca: fixPath(env.CA_PATH),
}

console.log("CProx| Load resolver...")
const resolvers = createResolvers(
    sortRules(
        parseRules(
            loadRawRules()
        )
    )
)
let resolverCache: ResolverCache = {}

const requestListener: RequestListener = (req, res) => {
    try {
        if (!req.headers.host || !req.url) {
            res.writeHead(404)
            res.end()
            return
        }
        const resolve = findResolver(
            req.headers.host,
            req.url,
            resolvers,
            resolverCache
        )
        if (!resolve) {
            res.writeHead(404)
            res.end()
            return
        }
        resolve?.http(req, res)
    } catch (err) {
        res.statusCode = 500
        res.end()
        console.error(err)
    }
}

const upgradeListener: UpgradeListener = (req, socket, head) => {
    try {
        if (!req.headers.host || !req.url) {
            socket.destroy()
            return
        }
        const resolve = findResolver(
            req.headers.host,
            req.url,
            resolvers,
            resolverCache
        )
        if (!resolve) {
            socket.destroy()
            return
        }
        resolve?.ws(req, socket, head)
    } catch (err: Error | any) {
        console.error(err)
        socket.destroy(err)
    }
}

let httpServer: HttpServer | undefined
let httpsServer: HttpsServer | undefined
let httpServerPromise: Promise<HttpServer> | undefined
let httpsServerPromise: Promise<HttpsServer> | undefined
let restartPromise: Promise<void> | undefined

const restart: () => Promise<void> = async () => {
    if (restartPromise) {
        restartPromise = restartPromise.then(() => start())
        return
    }
    const p = restartPromise = start()
    await p
    if (restartPromise == p) {
        restartPromise = undefined
    }
}

const start: () => Promise<void> = async () => {
    console.log("------------------------------------------------------")
    console.log("CProx| Starting...")
    httpServerPromise = createHttpServer(
        env.HTTP_PORT,
        env.BIND_ADDRESS,
        requestListener,
        upgradeListener,
        httpServer,
    )
    httpsServerPromise = createHttpsServer(
        env.HTTPS_PORT,
        env.BIND_ADDRESS,
        requestListener,
        upgradeListener,
        httpsServer,
        () => loadCerts(certPaths, env.IGNORE_EMPTY_CERT),
    )
    const [httpServer2, httpsServer2] = await Promise.all([
        httpServerPromise,
        httpsServerPromise
    ])
    httpServer = httpServer2
    httpsServer = httpsServer2
    console.log("CProx| Started!")
}

const watcher = createCertWatcher(certPaths, () => restart())
restart()
