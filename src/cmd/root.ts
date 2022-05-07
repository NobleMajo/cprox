import { Flag, CmdDefinition, CmdParserOptions } from "cmdy"
import env from "../env/envParser"
import dns from "dns"
import { RequestListener, Server as HttpServer } from "http"
import { Server as HttpsServer } from "https"
import { createCertWatcher, fixPath, loadCerts, Certs, generateSelfSigned, CertPaths } from '../certs';
import { loadRawRules, parseRules, sortRules } from "../rule"
import { createResolvers, findResolver, Resolver } from "../resolver"
import { createHttpServer, createHttpsServer, UpgradeListener } from "../server"
import { CacheHolder, MemoryCache } from "../cache"
import { parseRequestUrl } from "../reqdata"
import { promises as fs } from "fs"

export const verbose: Flag = {
    name: "verbose",
    shorthand: "v",
    description: "Show basic flag adn target informations.",
}

export const httpPort: Flag = {
    name: "http-port",
    alias: ["http"],
    shorthand: "p",
    types: ["number"],
    description: "Set the http port (default: 80 but disabled if any port is set)",
}

export const httpsPort: Flag = {
    name: "https-port",
    alias: ["https"],
    shorthand: "s",
    types: ["number"],
    description: "Set the https port (default: 443 but disabled if any port is set)",
}

export const trustAllCerts: Flag = {
    name: "trust-all-certs",
    alias: ["t-a-c", "tac"],
    shorthand: "t",
    types: ["string"],
    description: "Trust all certificats on proxy.",
}

export const bindHostAddress: Flag = {
    name: "bind-host-address",
    alias: ["b-h-a", "bha", "bind-host-address"],
    shorthand: "b",
    types: ["string"],
    description: "Set the host where the server pind the ports.",
}

export const selfSingedIfNeeded: Flag = {
    name: "self-singed-if-needed",
    alias: ["ssin", "s-s-i-n"],
    types: ["boolean"],
    description: "Generate self singed certificates if not exist.",
}

export const selfSingedDomain: Flag = {
    name: "self-singed-domain",
    alias: ["selfsingeddomain", "s-s-d", "ssd", "domain", "dom"],
    shorthand: "d",
    types: ["string"],
    description: "Set the domain name for self singed certificates.",
}

export const certPath: Flag = {
    name: "cert-path",
    alias: ["certpath", "cp"],
    shorthand: "c",
    types: ["string"],
    description: "Define the path for the certificats.",
}

const root: CmdDefinition = {
    name: "cprox",
    description: "CProX is a easy to configure redirect, proxy and static webserver.",
    details: "You can use CProX as webserver. It can proxy, redirect and service static content on requests.",
    flags: [
        httpPort,
        httpsPort,
        trustAllCerts,
        bindHostAddress,
        selfSingedIfNeeded,
        selfSingedDomain,
    ],
    allowUnknownArgs: true,
    cmds: [],
    exe: async (cmd) => {
        console.log("tesT: ", cmd)

        const rawSelfSingedDomain = cmd.valueFlags["self-singed-domain"]
        let selfSingedDomain: undefined | string =
            rawSelfSingedDomain &&
                rawSelfSingedDomain[0] &&
                rawSelfSingedDomain[0].length != 0 ?
                rawSelfSingedDomain[0] :
                rawSelfSingedDomain[0]
        const rawSelfSingedIfNeeded = cmd.valueFlags["self-singed-if-needed"]
        let selfSingedIfNeeded: undefined | boolean =
            rawSelfSingedIfNeeded &&
                rawSelfSingedIfNeeded[0] &&
                rawSelfSingedIfNeeded[0].length != 0 ?
                rawSelfSingedIfNeeded[0].toLowerCase() == "true" :
                undefined
        const rawBindHostAddress = cmd.valueFlags["bind-host-address"]
        let bindHostAddress: undefined | string =
            rawBindHostAddress &&
                rawBindHostAddress[0] &&
                rawBindHostAddress[0].length != 0 ?
                rawBindHostAddress[0] :
                undefined
        const rawTrustAllCerts = cmd.valueFlags["trust-all-certs"]
        let trustAllCerts: undefined | boolean =
            rawTrustAllCerts &&
                rawTrustAllCerts[0] &&
                rawTrustAllCerts[0].length != 0 ?
                rawTrustAllCerts[0].toLowerCase() == "true" :
                undefined
        const rawHttpsPort = cmd.valueFlags["https-port"]
        let httpsPort =
            rawHttpsPort &&
                rawHttpsPort[0] ?
                Number(rawHttpsPort[0]) :
                NaN
        const rawHttpPort = cmd.valueFlags["http-port"]
        let httpPort =
            rawHttpPort &&
                rawHttpPort[0] ?
                Number(rawHttpPort[0]) :
                NaN
        let verbose: boolean = cmd.flags
            .includes("verbose")

        if (typeof selfSingedDomain == "string") {
            env.SELF_SINGED_DOMAIN = selfSingedDomain
        }
        if (typeof selfSingedIfNeeded == "boolean") {
            env.SELF_SINGED_IF_NEEDED = selfSingedIfNeeded
        }
        if (typeof trustAllCerts == "boolean") {
            env.TRUST_ALL_CERTS = trustAllCerts
        }
        if (typeof bindHostAddress == "string") {
            env.BIND_ADDRESS = bindHostAddress
        }
        if (verbose) {
            env.VERBOSE = true
        }
        if (
            !isNaN(httpsPort) ||
            !isNaN(httpPort)
        ) {
            if (
                !isNaN(httpsPort) &&
                !isNaN(httpPort)
            ) {
                env.HTTP_PORT = httpPort
                env.HTTPS_PORT = httpsPort
            } else if (
                !isNaN(httpPort)
            ) {
                env.HTTP_PORT = httpPort
                env.HTTPS_PORT = null
            } else {
                env.HTTP_PORT = null
                env.HTTPS_PORT = httpsPort
            }
        }

        console.log("CProX| Init...")

        env.VERBOSE && console.log("CProX| Set dns server addresses...")
        dns.setServers(env.DNS_SERVER_ADDRESSES)

        env.VERBOSE && console.log("CProX| Set cert paths...")
        const certPaths = {
            cert: fixPath(env.CERT_PATH + "/" + env.CERT_NAME),
            key: fixPath(env.CERT_PATH + "/" + env.KEY_NAME),
            ca: fixPath(env.CERT_PATH + "/" + env.CA_NAME),
        }

        env.VERBOSE && console.log("CProX| Setup cache...")
        const cache = new MemoryCache()
        cache.startCheckInterval(1000 * 20, async (p) => {
            await p
            env.VERBOSE && console.log("CProX| Cache: cleared!")
        })

        env.VERBOSE && console.log("CProX| Load rules...")
        const rawRules = loadRawRules(cmd.args, "RULE_", true, env.VERBOSE)

        env.VERBOSE && console.log("CProX| RawRules:\n", Object.keys(rawRules))
        const parsedRules = parseRules(rawRules)

        env.VERBOSE && console.log("CProX| ParsedRules:\n", parsedRules.length)
        const rules = sortRules(parsedRules)
        if (rules.length == 0) {
            console.error("No rules found")
            process.exit(1)
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

        env.VERBOSE && console.log("CProX| Create CProX instance...")

        await new CProX(
            resolvers,
            cache,
            certPaths
        ).init()
    }
}

export class CProX {
    httpServer: HttpServer | undefined = undefined
    httpsServer: HttpsServer | undefined = undefined
    httpServerPromise: Promise<HttpServer> | undefined = undefined
    httpsServerPromise: Promise<HttpsServer> | undefined = undefined
    restartPromise: Promise<void> | undefined = undefined

    constructor(
        public resolvers: Resolver[],
        public cache: CacheHolder,
        public certPaths: CertPaths,
    ) { }

    requestListener: RequestListener = (req, res) => {
        try {
            res.setHeader("server", "CProX")
            res.setHeader("x-powered-by", "CProX")

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
                this.resolvers,
                this.cache,
                1000 * 30,
                env.VERBOSE
            )
            if (!resolve) {
                res.writeHead(404)
                res.end()
                return
            }
            resolve.http(data, req, res)
        } catch (err) {
            res.writeHead(500)
            res.end()
            console.error("Error on request!\npath:" + req.url + "\nhost:", req.headers.host, "\n", err)
        }
    }

    upgradeListener: UpgradeListener = (req, socket, head) => {
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
                this.resolvers,
                this.cache,
                1000 * 30,
                env.VERBOSE
            )
            if (!resolve) {
                socket.destroy()
                return
            }
            resolve.ws(data, req, socket, head)
        } catch (err: Error | any) {
            socket.destroy(err)
            console.error(err)
        }
    }

    async restart(): Promise<void> {
        if (this.restartPromise) {
            this.restartPromise = this.restartPromise.then(() => this.start())
            return
        }
        const p = this.restartPromise = this.start()
        await p
        if (this.restartPromise == p) {
            this.restartPromise = undefined
        }
    }

    async start(): Promise<void> {
        console.log("------------------------------------------------------")
        console.log("CProX| Starting...")
        if (typeof env.HTTPS_PORT == "number") {
            console.log("Start server on port '" + env.HTTPS_PORT + "'...")
            const certs: Certs = await loadCerts(this.certPaths)
            this.httpsServerPromise = createHttpsServer(
                env.HTTPS_PORT,
                env.BIND_ADDRESS,
                this.requestListener,
                this.upgradeListener,
                this.httpsServer,
                certs,
            )
        }
        if (typeof env.HTTP_PORT == "number") {
            console.log("Start server on port '" + env.HTTP_PORT + "'...")
            this.httpServerPromise = createHttpServer(
                env.HTTP_PORT,
                env.BIND_ADDRESS,
                this.requestListener,
                this.upgradeListener,
                this.httpServer,
            )
        }
        const [httpServer2, httpsServer2] = await Promise.all([
            this.httpServerPromise,
            this.httpsServerPromise
        ])
        this.httpServer = httpServer2
        this.httpsServer = httpsServer2
        console.log("CProX| Server started!")
    }

    async init() {
        if (typeof env.HTTPS_PORT == "number") {
            try {
                await loadCerts(this.certPaths)
            } catch (err) {
                if (!env.SELF_SINGED_IF_NEEDED) {
                    throw err
                }
                await fs.mkdir(env.CERT_PATH, {
                    recursive: true
                })
                await generateSelfSigned(env.SELF_SINGED_DOMAIN, this.certPaths)
            }
        }

        await this.restart()
        if (typeof env.HTTPS_PORT == "number") {
            const watcher = await createCertWatcher(
                this.certPaths,
                () => this.restart()
            )
        }
    }
}

export default {
    cmd: root,
    globalFlags: [
        verbose,
    ],
    globalHelpMsg: "! Fleetform | by majo418 | supported by CoreUnit.NET !",
} as CmdParserOptions

