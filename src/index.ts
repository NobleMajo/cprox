// import express, compression, cors, morgan
import dns from "dns"
import env from "./env/envParser"
import { RequestListener, Server as HttpServer } from "http"
import { Server as HttpsServer } from "https"
import { createCertWatcher, fixPath, loadCerts, Certs, generateSelfSigned } from './certs';
import { loadRawRules, parseRules, sortRules } from "./rule"
import { createResolvers, findResolver } from "./resolver"
import { createHttpServer, createHttpsServer, UpgradeListener } from "./server"
import { MemoryCache } from "./cache"
import { parseRequestUrl } from "./consts"

console.log("CProX| Init...")

dns.setServers(env.DNS_SERVER_ADDRESSES)

const certPaths = {
    cert: fixPath(env.CERT_PATH),
    key: fixPath(env.KEY_PATH),
    ca: fixPath(env.CA_PATH),
}

const cache = new MemoryCache()
cache.startCheckInterval(1000 * 20, async (p) => {
    await p
    env.VERBOSE && console.log("CProX| Cache: cleared!")
})

console.log("CProX| Load rules...")
const rawRules = loadRawRules("RULE_", true, env.VERBOSE)
env.VERBOSE && console.log("CProX| RawRules:\n", Object.keys(rawRules))
const parsedRules = parseRules(rawRules)
env.VERBOSE && console.log("CProX| ParsedRules:\n", parsedRules.length)
const rules = sortRules(parsedRules)
if (rules.length == 0) {
    console.error("No rules found")
    process.exit(0)
}
env.VERBOSE && console.log("CProX| SortedRules:\n", rules.length)
console.log("CProX| " + rules.length + " rules found!")
console.log("CProX| Create resolver...")
const resolvers = createResolvers(
    rules,
    cache,
    {
        cacheMillis: 1000 * 60 * 2,
        verbose: env.VERBOSE,
    }
)
env.VERBOSE && console.log("CProX| Resolvers:\n", resolvers.length)

console.log("CProX| Create vars...")
const requestListener: RequestListener = (req, res) => {
    try {
        res.setHeader("X-powered-by", "CProX")
        res.setHeader("Server", "CProX")
        if (!req.headers.host || !req.url) {
            res.writeHead(404)
            res.end()
            return
        }
        const data = parseRequestUrl(
            req.headers.host,
            req.url
        )
        const resolve = findResolver(
            data,
            resolvers,
            cache,
            1000 * 30,
            env.VERBOSE
        )
        if (!resolve) {
            res.writeHead(404)
            res.end()
            return
        }
        resolve?.http(data, req, res)
    } catch (err) {
        res.statusCode = 500
        res.end()
        console.error("Error on request!\npath:" + req.url + "\nhost:", req.headers.host, "\n", err)
    }
}

const upgradeListener: UpgradeListener = (req, socket, head) => {
    try {
        if (!req.headers.host || !req.url) {
            socket.destroy()
            return
        }
        const data = parseRequestUrl(
            req.headers.host,
            req.url
        )
        const resolve = findResolver(
            data,
            resolvers,
            cache,
            1000 * 30,
            env.VERBOSE
        )
        if (!resolve) {
            socket.destroy()
            return
        }
        resolve?.ws(data, req, socket, head)
    } catch (err: Error | any) {
        socket.destroy(err)
        console.error(err)
    }
}

let httpServer: HttpServer | undefined
let httpsServer: HttpsServer | undefined
let httpServerPromise: Promise<HttpServer> | undefined
let httpsServerPromise: Promise<HttpsServer> | undefined
let restartPromise: Promise<void> | undefined

export async function restart(): Promise<void> {
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

export async function start(): Promise<void> {
    const certs: Certs = await loadCerts(certPaths)

    console.log("------------------------------------------------------")
    console.log("CProX| Starting...")
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
        certs,
    )
    const [httpServer2, httpsServer2] = await Promise.all([
        httpServerPromise,
        httpsServerPromise
    ])
    httpServer = httpServer2
    httpsServer = httpsServer2
    console.log("CProX| Started!")
}

export async function init() {
    try {
        await loadCerts(certPaths)
    } catch (err) {
        if (!env.SELF_SINGED_IF_NEEDED) {
            throw err
        }
        await generateSelfSigned(env.SELF_SINGED_DOMAIN, certPaths)
    }

    await restart()
    const watcher = createCertWatcher(
        certPaths,
        () => restart()
    )
}
init()
