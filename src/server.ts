import http, { RequestListener, Server as HttpServer, ServerResponse } from "http"
import https, { Server as HttpsServer } from "https"
import { Duplex } from "stream"
import { Certs } from "./certs"

export type UpgradeListener = (
    req: http.IncomingMessage,
    socket: Duplex,
    head: Buffer
) => void

export function createHttpsServer(
    port: number,
    bindAddress: string,
    requestListener: RequestListener,
    upgradeListener: UpgradeListener,
    certs: Certs,
    connectionTimeout: number,
    maxHeaderSize: number,
): Promise<HttpsServer> {
    return new Promise(async (res, rej) => {
        try {
            const server: HttpsServer = https.createServer(
                {
                    maxHeaderSize: maxHeaderSize,
                    ...certs,
                },
                requestListener
            )
            server.setTimeout(connectionTimeout)
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

export async function closeServer(
    server: HttpsServer | HttpServer | undefined,
) {
    if (server) {
        await new Promise<void>(
            (res, rej) =>
                server ?
                    server.close(
                        (err) =>
                            err ? rej(err) : res()
                    ) :
                    res()
        )
    }
}

export function createHttpServer(
    port: number,
    bindAddress: string,
    requestListener: RequestListener,
    upgradeListener: UpgradeListener,
    connectionTimeout: number,
    maxHeaderSize: number,
): Promise<HttpServer> {
    return new Promise(async (res, rej) => {
        try {
            const server: HttpServer = http.createServer(
                {
                    maxHeaderSize: maxHeaderSize
                },
                requestListener
            )
            server.setTimeout(connectionTimeout)
            server.on(
                'upgrade',
                upgradeListener
            )
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