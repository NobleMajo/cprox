import { CmdDefinition, CmdParserOptions, BoolFlag, ValueFlag, Awaitable } from "cmdy"
import env from "../env/envParser"
import dns from "dns"
import { RequestListener, Server as HttpServer } from "http"
import { Server as HttpsServer } from "https"
import { createCertWatcher, fixPath, loadCerts, Certs, generateSelfSigned, CertPaths } from '../certs';
import { loadRawRules, parseRules, sortRules } from "../rule"
import { createResolvers, findResolver, Resolver, Resolvers } from "../resolver"
import { closeServer, createHttpServer, createHttpsServer, UpgradeListener } from "../server"
import { parseRequestUrl } from "../reqdata"
import { promises as fs } from "fs"
import { cmdFlag } from "typenvy"
import { envTypes, envDefaults } from "../env/env"

export const verbose: BoolFlag = cmdFlag(
    {
        name: "verbose",
        shorthand: "v",
        description: "Show basic flag adn target informations",
    },
    "VERBOSE",
    envTypes,
    envDefaults,
    env
)

export const rules: ValueFlag = {
    name: "rule",
    alias: ["rul"],
    shorthand: "r",
    types: ["string"],
    multiValues: true,
    description: "CProX rules",
}

export const httpPort: ValueFlag = cmdFlag(
    {
        name: "http-port",
        alias: ["http"],
        shorthand: "p",
        types: ["number"],
        description: "Set the http port (default: 80 but disabled if any port is set)",
    }
    ,
    "HTTP_PORT",
    envTypes,
    envDefaults,
    env
)

export const httpsPort: ValueFlag = cmdFlag(
    {
        name: "https-port",
        alias: ["https"],
        shorthand: "s",
        types: ["number"],
        description: "Set the https port (default: 443 but disabled if any port is set)",
    },
    "HTTPS_PORT",
    envTypes,
    envDefaults,
    env
)

export const trustAllCerts: BoolFlag = cmdFlag(
    {
        name: "trust-all-certs",
        alias: ["t-a-c", "tac"],
        shorthand: "t",
        description: "Trust all certificates on proxy",
    },
    "TRUST_ALL_CERTS",
    envTypes,
    envDefaults,
    env
)

export const disableSelfSinged: BoolFlag = cmdFlag(
    {
        name: "disable-self-singed",
        alias: ["disableselfsinged", "d-s-s", "dss"],
        description: "Disable generating self singed certificates if not exist",
    },
    "DISABLE_SELF_SINGED",
    envTypes,
    envDefaults,
    env
)

export const bindHostAddress: ValueFlag = cmdFlag(
    {
        name: "bind-host-address",
        alias: ["b-h-a", "bha", "bind-host-address"],
        shorthand: "b",
        types: ["string"],
        description: "Set the host where the server pind the ports",
    },
    "BIND_ADDRESS",
    envTypes,
    envDefaults,
    env
)

export const dnsServerAddress: ValueFlag = cmdFlag(
    {
        name: "dns-server-address",
        alias: ["dns-server", "dnsserveraddress", "dns-address", "dns"],
        types: ["string"],
        description: "Add a dns address to the existing dns addresses",
        multiValues: true,
    },
    "DNS_SERVER_ADDRESSES",
    envTypes,
    envDefaults,
    env
)

export const selfSingedDomain: ValueFlag = cmdFlag(
    {
        name: "self-singed-domain",
        alias: ["selfsingeddomain", "s-s-d", "ssd", "domain", "dom"],
        shorthand: "d",
        types: ["string"],
        description: "Set the domain name for self singed certificates",
    },
    "SELF_SINGED_DOMAIN",
    envTypes,
    envDefaults,
    env
)

export const certPath: ValueFlag = cmdFlag(
    {
        name: "cert-path",
        alias: ["certpath"],
        types: ["string"],
        description: "Define the path for the certificates",
    },
    "CERT_PATH",
    envTypes,
    envDefaults,
    env
)

export const certName: ValueFlag = cmdFlag(
    {
        name: "cert-name",
        alias: ["certname"],
        types: ["string"],
        description: "Define the name for the certificates cert file",
    },
    "CERT_NAME",
    envTypes,
    envDefaults,
    env
)

export const keyName: ValueFlag = cmdFlag(
    {
        name: "key-name",
        alias: ["keyname"],
        types: ["string"],
        description: "Define the name for the certificates key file",
    },
    "KEY_NAME",
    envTypes,
    envDefaults,
    env
)
export const caName: ValueFlag = cmdFlag(
    {
        name: "ca-name",
        alias: ["caname"],
        types: ["string"],
        description: "Define the name for the certificate ca file",
    },
    "CA_NAME",
    envTypes,
    envDefaults,
    env
)

export const maxHeaderSize: ValueFlag = cmdFlag(
    {
        name: "max-header-size",
        alias: ["headersize", "maxheader", "max-header", "maxheadersize", "header-size"],
        types: ["number", "string"],
        description: "Define the maximum request header size (default: 1024 * 4)",
    },
    "MAX_HEADER_SIZE",
    envTypes,
    envDefaults,
    env
)

export const connectionTimeout: ValueFlag = cmdFlag(
    {
        name: "connection-timeout",
        alias: ["connect-timeout", "connecttimeout", "connectt", "connectiontimeout", "connectiont", "ctimeout"],
        types: ["number", "string"],
        description: "Define the maximum time in miliseconds (or as millisecond calucaltion) for a open conneciton",
    },
    "CONNECTION_TIMEOUT",
    envTypes,
    envDefaults,
    env
)

export const proxyReactionTimeout: ValueFlag = cmdFlag(
    {
        name: "proxy-reaction-timeout",
        alias: ["proxyreactiontimeout", "prt"],
        types: ["number", "string"],
        description: "Define the maximum time in miliseconds (or as millisecond calucaltion) that the proxy target has to respond",
    },
    "PROXY_REACTION_TIMEOUT",
    envTypes,
    envDefaults,
    env
)

export const proxyVerifyCertificate: BoolFlag = cmdFlag(
    {
        name: "proxy-verify-certificate",
        alias: ["proxyverifycertificate", "pvc"],
        description: "Proxy verify target certificates",
    },
    "PROXY_VERIFY_CERTIFICATE",
    envTypes,
    envDefaults,
    env
)

export const proxyFollowRedirects: BoolFlag = cmdFlag(
    {
        name: "proxy-follow-redirects",
        alias: ["proxyfollowredirects", "pfr"],
        description: "Proxy follow redirects",
    },
    "PROXY_FOLLOW_REDIRECTS",
    envTypes,
    envDefaults,
    env
)

const root: CmdDefinition = {
    name: "cprox",
    description: "CProX is a easy to configure redirect, proxy and static webserver",
    details: "You can use CProX as webserver. It can proxy, redirect and service static content on requests",
    flags: [
        httpPort,
        httpsPort,
        trustAllCerts,
        bindHostAddress,
        disableSelfSinged,
        selfSingedDomain,
        dnsServerAddress,
        certPath,
        certName,
        keyName,
        caName,
        rules,
        maxHeaderSize,
        connectionTimeout,
        proxyReactionTimeout,
        proxyVerifyCertificate,
        proxyFollowRedirects,
    ],
    allowUnknownArgs: true,
    cmds: [],
    exe: async (cmd) => {
        env.VERBOSE && console.debug("VERBOSE MODE ENABLED!")
        env.VERBOSE && console.debug("ENV: ", env, "\n\n")

        let httpsPort = Number(cmd.valueFlags["https-port"])
        let httpPort = Number(cmd.valueFlags["http-port"])

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

        console.info("CProX| Init...")

        env.VERBOSE && console.debug("CProX| Set dns server addresses...")
        dns.setServers(env.DNS_SERVER_ADDRESSES)

        env.VERBOSE && console.debug("CProX| Set cert paths...")
        const certPaths = {
            cert: fixPath(env.CERT_PATH + "/" + env.CERT_NAME),
            key: fixPath(env.CERT_PATH + "/" + env.KEY_NAME),
            ca: fixPath(env.CERT_PATH + "/" + env.CA_NAME),
        }

        env.VERBOSE && console.debug("CProX| Load rules...")

        const rawRules = loadRawRules(
            [
                ...cmd.arrayFlags.rule,
                ...cmd.args
            ],
            "RULE_",
            env.VERBOSE
        )

        env.VERBOSE && console.debug("CProX| RawRules:\n", Object.keys(rawRules))
        const parsedRules = parseRules(rawRules)

        env.VERBOSE && console.debug("CProX| ParsedRules:\n", parsedRules.length)
        const rules = sortRules(parsedRules)
        if (rules.length == 0) {
            console.error("No rules found!")
            console.error("Try to run this command with '--help' flag.")
            process.exit(1)
        }

        env.VERBOSE && console.debug("CProX| SortedRules:\n", rules.length)
        console.info("CProX| " + rules.length + " rules found!")
        console.info("CProX| Create resolver...")
        const resolvers = createResolvers(
            rules,
            {
                cacheMillis: 1000 * 60 * 2,
                verbose: env.VERBOSE,
            }
        )
        env.VERBOSE && console.debug("CProX| Resolvers:\n", resolvers.length)
        env.VERBOSE && console.debug("CProX| Create CProX instance...")

        await new CProX(
            resolvers,
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
        public resolvers: Resolvers,
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
                undefined,
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
                undefined,
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
        console.info("------------------------------------------------------")
        console.info("CProX| Starting...")
        if (typeof env.HTTPS_PORT == "number") {
            await closeServer(this.httpsServer)
            console.info("Start https server on port '" + env.HTTPS_PORT + "'...")
            const certs: Certs = await loadCerts(this.certPaths)
            this.httpsServerPromise = createHttpsServer(
                env.HTTPS_PORT,
                env.BIND_ADDRESS,
                certs,
                env.CONNECTION_TIMEOUT,
                env.MAX_HEADER_SIZE,
                this.requestListener,
                this.upgradeListener,
            )
            if (typeof env.HTTP_PORT == "number") {
                await closeServer(this.httpServer)
                console.info("Start http redirect server on port '" + env.HTTP_PORT + "'...")
                this.httpServerPromise = createHttpServer(
                    env.HTTP_PORT,
                    env.BIND_ADDRESS,
                    env.CONNECTION_TIMEOUT,
                    env.MAX_HEADER_SIZE,
                    (req, res) => {
                        let host = req.headers['host']
                        if (
                            typeof host != "string" ||
                            host.length == 0
                        ) {
                            res.writeHead(400)
                            res.end("Host header not defined!")
                            return
                        }
                        if (!host.includes(":")) {
                            host += ":" + env.HTTPS_PORT
                        }
                        const upgradeTo = req.headers['upgrade']
                        const ws = typeof upgradeTo == "string" &&
                            upgradeTo.length != 0 &&
                            upgradeTo.toLowerCase().includes("websocket")

                        res.writeHead(
                            301,
                            {
                                "Location": (ws ? "wss://" : "https://") + host + req.url
                            }
                        )
                        res.end()
                    },

                )
            }
        } else if (typeof env.HTTP_PORT == "number") {
            await closeServer(this.httpServer)
            console.info("Start http server on port '" + env.HTTP_PORT + "'...")
            this.httpServerPromise = createHttpServer(
                env.HTTP_PORT,
                env.BIND_ADDRESS,
                env.CONNECTION_TIMEOUT,
                env.MAX_HEADER_SIZE,
                this.requestListener,
                this.upgradeListener,
            )
        }
        const [httpServer2, httpsServer2] = await Promise.all([
            this.httpServerPromise,
            this.httpsServerPromise
        ])
        this.httpServer = httpServer2
        this.httpsServer = httpsServer2
        console.info("CProX| Server started!")
    }

    async init() {
        if (typeof env.HTTPS_PORT == "number") {
            try {
                await loadCerts(this.certPaths)
            } catch (err) {
                if (env.DISABLE_SELF_SINGED) {
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
    globalHelpMsg: "! CProX | by majo418 | supported by CoreUnit.NET !",
} as CmdParserOptions

