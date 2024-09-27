import { promises as fs } from "fs";
import { Server as HttpServer, RequestListener } from "http";
import { Server as HttpsServer } from "https";
import { CertPaths, Certs, createCertWatcher, generateSelfSigned, loadCerts } from './certs';
import env from "./env/envParser";
import { parseRequestHostPath } from "./reqdata";
import { Resolvers, findResolver } from "./resolver";
import { UpgradeListener, closeServer, createHttpServer, createHttpsServer } from "./server";

export class CProX {
    httpServer: HttpServer | undefined = undefined
    httpsServer: HttpsServer | undefined = undefined
    httpServerPromise: Promise<HttpServer> | undefined = undefined
    httpsServerPromise: Promise<HttpsServer> | undefined = undefined
    restartPromise: Promise<void> | undefined = undefined

    constructor(
        public resolvers: Resolvers,
        public certPaths: CertPaths,
        public verbose: boolean,
    ) { }

    requestListener: RequestListener = (req, res) => {
        this.verbose ?? console.debug(
            "CProX| Request from '" +
            req.socket.remoteAddress + ":" +
            req.socket.remotePort + "'"
        )
        try {
            res.setHeader("server", "CProX")
            res.setHeader("x-powered-by", "CProX")

            if (!req.headers.host || !req.url) {
                res.writeHead(404)
                res.end()
                return
            }
            const data = parseRequestHostPath(
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
        this.verbose ?? console.debug(
            "CProX| Upgrade from '" +
            req.socket.remoteAddress + ":" +
            req.socket.remotePort + "'"
        )
        try {
            if (!req.headers.host || !req.url) {
                socket.destroy()
                return
            }
            const data = parseRequestHostPath(
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
        this.httpsServer = httpsServer2;

        if (this.verbose) {
            if (this.httpsServer) {
                this.verbose && this.httpsServer.on(
                    "secureConnection",
                    (socket) => console.debug(
                        "CProX| TLS Connection from '" +
                        socket.remoteAddress + ":" +
                        socket.remotePort + "'"
                    )
                )
            }
            if (this.httpServer) {
                this.verbose && this.httpServer.on(
                    "connection",
                    (socket) => console.debug(
                        "CProX| Unsecure connection from '" +
                        socket.remoteAddress + ":" +
                        socket.remotePort + "'"
                    )
                )
            }
        }

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

                await generateSelfSigned(
                    this.certPaths,
                    [
                        {
                            name: "countryName",
                            value: env.SELF_SINGED_COUNTRY_CODE,
                        },
                        {
                            name: "commonName",
                            value: env.SELF_SINGED_COMMON_DOMAIN_NAME,
                        },
                        {
                            name: "stateOrProvinceName",
                            value: env.SELF_SINGED_STATE_NAME,
                        },
                        {
                            name: "localityName",
                            value: env.SELF_SINGED_LOCALITY_NAME,
                        },
                        {
                            name: "organizationName",
                            value: env.SELF_SINGED_ORGANIZATION_NAME,
                        },
                        {
                            name: "emailAddress",
                            value: env.SELF_SINGED_EMAIL_ADDRESS,
                        },
                        {
                            name: "nsComment",
                            value: env.SELF_SINGED_NETSCAPE_COMMENT,
                        }
                    ],
                )
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