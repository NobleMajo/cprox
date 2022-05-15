import { CmdDefinition, CmdParserOptions, BoolFlag, ValueFlag } from "cmdy"
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
import { cmdFlag } from "typenvy"
import { variablesTypes } from "../env/env"

export const verbose: BoolFlag = cmdFlag(
    {
        name: "verbose",
        shorthand: "v",
        description: "Show basic flag adn target informations.",
    },
    "VERBOSE",
    variablesTypes,
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
    variablesTypes,
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
    variablesTypes,
    env
)

export const trustAllCerts: BoolFlag = cmdFlag(
    {
        name: "trust-all-certs",
        alias: ["t-a-c", "tac"],
        shorthand: "t",
        description: "Trust all certificates on proxy.",
    },
    "TRUST_ALL_CERTS",
    variablesTypes,
    env
)

export const disableSelfSinged: BoolFlag = cmdFlag(
    {
        name: "disable-self-singed",
        alias: ["disableselfsinged", "d-s-s", "dss"],
        description: "Disable generating self singed certificates if not exist.",
    },
    "DISABLE_SELF_SINGED",
    variablesTypes,
    env
)

export const bindHostAddress: ValueFlag = cmdFlag(
    {
        name: "bind-host-address",
        alias: ["b-h-a", "bha", "bind-host-address"],
        shorthand: "b",
        types: ["string"],
        description: "Set the host where the server pind the ports.",
    },
    "BIND_ADDRESS",
    variablesTypes,
    env
)

export const dnsServerAddress: ValueFlag = cmdFlag(
    {
        name: "dns-server-address",
        alias: ["dns-server", "dnsserveraddress", "dns-address", "dns"],
        types: ["string"],
        description: "Add a dns address to the existing dns addresses.",
        multiValues: true,
    },
    "DNS_SERVER_ADDRESSES",
    variablesTypes,
    env
)

export const selfSingedDomain: ValueFlag = cmdFlag(
    {
        name: "self-singed-domain",
        alias: ["selfsingeddomain", "s-s-d", "ssd", "domain", "dom"],
        shorthand: "d",
        types: ["string"],
        description: "Set the domain name for self singed certificates.",
    },
    "SELF_SINGED_DOMAIN",
    variablesTypes,
    env
)

export const certPath: ValueFlag = cmdFlag(
    {
        name: "cert-path",
        alias: ["certpath"],
        types: ["string"],
        description: "Define the path for the certificates.",
    },
    "CERT_PATH",
    variablesTypes,
    env
)

export const certName: ValueFlag = cmdFlag(
    {
        name: "cert-name",
        alias: ["certname"],
        types: ["string"],
        description: "Define the name for the certificates cert file.",
    },
    "CERT_NAME",
    variablesTypes,
    env
)

export const keyName: ValueFlag = cmdFlag(
    {
        name: "key-name",
        alias: ["keyname"],
        types: ["string"],
        description: "Define the name for the certificates key file.",
    },
    "KEY_NAME",
    variablesTypes,
    env
)
export const caName: ValueFlag = cmdFlag(
    {
        name: "ca-name",
        alias: ["caname"],
        types: ["string"],
        description: "Define the name for the certificate ca file.",
    },
    "CA_NAME",
    variablesTypes,
    env
)

export const requestTimeout: ValueFlag = cmdFlag(
    {
        name: "request-timeout",
        alias: ["requesttimeout", "requestt", "rtimeout"],
        types: ["number", "string"],
        description: "Define the maximum time in miliseconds (or as millisecond calucaltion) for the request content.",
    },
    "REQUEST_TIMEOUT",
    variablesTypes,
    env
)

export const connectionTimeout: ValueFlag = cmdFlag(
    {
        name: "connection-timeout",
        alias: ["connect-timeout", "connecttimeout", "connectt", "connectiontimeout", "connectiont", "ctimeout"],
        types: ["number", "string"],
        description: "Define the maximum time in miliseconds (or as millisecond calucaltion) for a open conneciton.",
    },
    "CONNECTION_TIMEOUT",
    variablesTypes,
    env
)

export const proxyReactionTimeout: ValueFlag = cmdFlag(
    {
        name: "proxy-reaction-timeout",
        alias: ["proxyreactiontimeout", "prt"],
        types: ["number", "string"],
        description: "Define the maximum time in miliseconds (or as millisecond calucaltion) that the proxy target has to respond.",
    },
    "PROXY_REACTION_TIMEOUT",
    variablesTypes,
    env
)

export const proxyVerifyCertificate: BoolFlag = cmdFlag(
    {
        name: "proxy-verify-certificate",
        alias: ["proxyverifycertificate", "pvc"],
        description: "Proxy verify target certificates",
    },
    "PROXY_VERIFY_CERTIFICATE",
    variablesTypes,
    env
)

export const proxyFollowRedirects: BoolFlag = cmdFlag(
    {
        name: "proxy-follow-redirects",
        alias: ["proxyfollowredirects", "pfr"],
        description: "Proxy follow redirects",
    },
    "PROXY_FOLLOW_REDIRECTS",
    variablesTypes,
    env
)

/*
REQUEST_TIMEOUT: 1000 * 3 as number,
CONNECTION_TIMEOUT: 1000 * 60 * 2 as number,

PROXY_VERIFY_CERTIFICAT: false as boolean,
PROXY_REACTION_TIMEOUT: 1000 * 3 as number,
PROXY_FOLLOW_REDIRECTS: false as boolean,
*/

const root: CmdDefinition = {
    name: "cprox",
    description: "CProX is a easy to configure redirect, proxy and static webserver.",
    details: "You can use CProX as webserver. It can proxy, redirect and service static content on requests.",
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
        requestTimeout,
        connectionTimeout,
        proxyReactionTimeout,
        proxyVerifyCertificate,
        proxyFollowRedirects,
    ],
    allowUnknownArgs: true,
    cmds: [],
    exe: async (cmd) => {
        console.debug("ENV: ", env)

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

        const rawRules = loadRawRules(
            [
                ...cmd.arrayFlags.rule,
                ...cmd.args
            ],
            "RULE_",
            env.VERBOSE
        )

        env.VERBOSE && console.log("CProX| RawRules:\n", Object.keys(rawRules))
        const parsedRules = parseRules(rawRules)

        env.VERBOSE && console.log("CProX| ParsedRules:\n", parsedRules.length)
        const rules = sortRules(parsedRules)
        if (rules.length == 0) {
            console.error("No rules found!")
            console.error("Try to run this command with '--help' flag.")
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

