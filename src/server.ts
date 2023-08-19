import * as http from "http"
import { Server as HttpServer, RequestListener } from "http"
import * as https from "https"
import { Server as HttpsServer } from "https"
import { Duplex } from "stream"
import { Certs, LoadedCerts } from "./certs"

export type UpgradeListener = (
    req: http.IncomingMessage,
    socket: Duplex,
    head: Buffer
) => void

export function createHttpsServer(
    port: number,
    bindAddress: string,
    certs: Certs | LoadedCerts,
    connectionTimeout: number,
    maxHeaderSize: number,
    requestListener: RequestListener,
    upgradeListener?: UpgradeListener,
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
            upgradeListener && server.on('upgrade', upgradeListener)
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
    connectionTimeout: number,
    maxHeaderSize: number,
    requestListener: RequestListener,
    upgradeListener?: UpgradeListener,
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
            upgradeListener && server.on('upgrade', upgradeListener)
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