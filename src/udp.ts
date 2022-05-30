import { createSocket, Socket, RemoteInfo } from "dgram"

export type UdpBufferCallback = (bug: Buffer, remote: RemoteInfo) => void
export type UdpMsgCallback = (msg: string, remote: RemoteInfo) => void

export function createServerSocket(
    port: number,
    bindHost: string = "0.0.0.0",
    msgCb: UdpBufferCallback,
    sock: Socket = createClientSocket()
): Promise<Socket> {
    return new Promise<Socket>((res, rej) => {
        sock.on("listening", () => res(sock))
        sock.on("message", msgCb)
        sock.on("error", rej)
        sock.bind(port, bindHost)

    })
}

export function createUdpMsgCallback(
    callback: UdpMsgCallback,
    encoding: BufferEncoding = "utf8",
): UdpBufferCallback {
    return (buf, remote) => callback(
        buf.toString(encoding),
        remote
    )
}

export type MsgTarget = {
    host: string,
    port: number,
    sock: MsgSocket,
    encoding?: BufferEncoding,
    msg(
        msg: string,
        encoding?: BufferEncoding
    ): Promise<void>,
    originSend(
        msg: string | Uint8Array | ReadonlyArray<any>,
    ): Promise<void>,
}

export type MsgSocket = Socket & {
    msg(
        host: string,
        port: number,
        msg: string,
        encoding?: BufferEncoding,
    ): Promise<void>,
    target(
        host: string,
        port: number,
        encoding?: BufferEncoding,
    ): MsgTarget
}

export function createClientSocket(): Socket {
    return createSocket("udp4")
}

export function createUdpMsgSender(
    sock: Socket = createClientSocket(),
): MsgSocket {
    const sock2: MsgSocket = sock as any
    sock2.msg = (
        host,
        port,
        msg,
        encoding,
    ) => new Promise<void>(
        (res, rej) => sock2.send(
            Buffer.from(msg, encoding),
            port,
            host,
            (err) => err ? rej(err) : res(),
        )
    )
    sock2.target = (
        host,
        port,
        encoding,
    ) => ({
        host: host,
        port: port,
        sock: sock2,
        encoding: encoding,
        msg: function (
            msg,
            encoding,
        ) {
            return sock2.msg(
                this.host,
                this.port,
                msg,
                encoding ?? this.encoding,
            )
        },
        originSend: function (
            msg,
        ) {
            return new Promise<void>(
                (
                    res,
                    rej
                ) => this.sock.send(
                    msg,
                    this.port,
                    this.host,
                    (err) => err ? rej(err) : res()
                )
            )
        }
    })
    return sock2
}