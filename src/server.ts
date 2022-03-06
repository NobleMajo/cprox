import http, { RequestListener, Server as HttpServer, ServerResponse } from "http"
import https, { Server as HttpsServer } from "https"
import { Duplex } from "stream"
import { Certs } from "./certs"

export type UpgradeListener = (req: http.IncomingMessage, socket: Duplex, head: Buffer) => void

export function createHttpsServer(
    port: number,
    bindAddress: string,
    requestListener: RequestListener,
    upgradeListener: UpgradeListener,
    oldServer: HttpsServer | undefined,
    certs: Certs,
): Promise<HttpsServer> {
    return new Promise(async (res, rej) => {
        try {
            if (oldServer) {
                await new Promise<void>(
                    (res, rej) =>
                        oldServer ?
                            oldServer.close(
                                (err) =>
                                    err ? rej(err) : res()
                            ) :
                            res()
                )
            }

            const server: HttpsServer = https.createServer(
                {
                    ...certs,
                },
                requestListener
            )
            server.on('upgrade', upgradeListener)

            server.listen(
                port,
                bindAddress,
                () => res(server),
            )
        } catch (err) {
            rej(err)
        }
    })
}

export function createHttpServer(
    port: number,
    bindAddress: string,
    requestListener: RequestListener,
    upgradeListener: UpgradeListener,
    oldServer: HttpServer | undefined,
): Promise<HttpServer> {
    return new Promise(async (res, rej) => {
        try {
            if (oldServer) {
                await new Promise<void>(
                    (res, rej) =>
                        oldServer ?
                            oldServer.close(
                                (err) =>
                                    err ? rej(err) : res()
                            ) :
                            res()
                )
            }

            const server: HttpServer = http.createServer(
                {},
                requestListener
            )
            server.on('upgrade', upgradeListener)

            server.listen(
                port,
                bindAddress,
                () => res(server),
            )
        } catch (err) {
            rej(err)
        }
    })
}