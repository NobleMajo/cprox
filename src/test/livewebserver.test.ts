import 'mocha';
import { expect } from 'chai'
import { ChildProcess, fork } from 'child_process';
import { after, before } from 'mocha';
import fetch, { Response } from 'node-fetch';
import { uniqueStringify } from '../json';

export interface AsyncForkResult {
    spawned: boolean,
    killed: boolean,
    sysOut: string,
    sysErr: string,
    spawnPromise: Promise<void>,
    promise: Promise<void> | null,
    killPromise: Promise<void> | null,
    child: ChildProcess,
    code: number | null,
    kill: () => Promise<void>
}

export class AsyncForkError extends Error {
    constructor(
        msg: string,
        public result: AsyncForkResult,
    ) {
        super(msg)
    }
}

export interface AsyncForkOptions {
    args?: string[],
    env?: NodeJS.ProcessEnv,
    spawnTimeout?: number,
    timeout?: number,
    closeTimeout?: number,
}

export interface AsyncForkSettings {
    args: string[],
    env: NodeJS.ProcessEnv,
    spawnTimeout: number,
    timeout: number,
    closeTimeout: number,
}

export const defaultAsyncForkSettings: AsyncForkSettings = {
    args: [],
    env: {},
    spawnTimeout: 1000 * 3,
    timeout: 1000 * 6,
    closeTimeout: 1000 * 3,
}

export async function asyncFork(
    modulePath: string,
    options: AsyncForkOptions,
): Promise<AsyncForkResult> {
    const settings: AsyncForkSettings = {
        ...defaultAsyncForkSettings,
        ...options,
    }
    try {
        const child = fork(modulePath, settings.args, {
            execArgv: ["node_modules/ts-node/dist/bin.js"],
            silent: true,
            env: settings.env,
        })
        const result: AsyncForkResult = {
            spawned: false,
            killed: false,
            sysOut: "",
            sysErr: "",
            code: null,
            child: child,
            spawnPromise: undefined as any,
            promise: null,
            killPromise: null,
            kill: () => {
                if (result.killPromise) {
                    return result.killPromise
                }
                result.killPromise = new Promise<void>((res, rej) => {
                    child.on(
                        'close',
                        (code) => {
                            res()
                        }
                    )
                    if (result.killed) {
                        res()
                        return
                    }
                    if (settings.closeTimeout > 0) {
                        setTimeout(
                            () => {
                                child.kill(9)
                                rej(
                                    new AsyncForkError(
                                        "Async fork process kill timeout!",
                                        result
                                    )
                                )
                            },
                            settings.closeTimeout
                        )
                    }
                    child.kill(15)
                })
                return result.killPromise
            }
        }
        if (!child.stdout) {
            throw new AsyncForkError(
                "No strout!",
                result
            )
        }
        if (!child.stderr) {
            throw new AsyncForkError(
                "No strerr!",
                result
            )
        }
        child.stdout.on('data', (data: Buffer) => {
            result.sysOut += data.toString("utf-8")
        })
        child.stderr.on('data', (data: Buffer) => {
            result.sysErr += data.toString("utf-8")
        })
        child.on('close', (code) => {
            result.code = code
            result.killed = true
        })
        child.on(
            'spawn',
            () => {
                result.spawned = true
            }
        )

        const live = () => {
            result.promise = new Promise<void>((res, rej) => {
                child.on('close', (code) => {
                    res()
                })
                if (result.killed) {
                    res()
                    return
                }
                if (settings.timeout > 0) {
                    setTimeout(
                        async () => {
                            await result.kill()
                            rej(
                                new AsyncForkError(
                                    "Async fork process live timeout!",
                                    result
                                )
                            )
                        },
                        settings.timeout
                    )
                }
            })
        }

        child.on(
            'spawn',
            () => {
                result.spawned = true
            }
        )

        result.spawnPromise = new Promise<void>((res, rej) => {
            if (result.spawned) {
                live()
                res()
                return
            }
            child.on(
                'spawn',
                () => {
                    live()
                    res()
                }
            )
            if (settings.spawnTimeout > 0) {
                setTimeout(
                    () => rej(
                        new AsyncForkError(
                            "Async fork process spawn timeout!",
                            result
                        )
                    ),
                    settings.spawnTimeout
                )
            }
        })
        return result
    } catch (err) {
        throw err
    }
}

export async function startCprox(
    args: string[]
): Promise<AsyncForkResult> {
    const result = await asyncFork(
        __dirname + "/../index",
        {
            args: args,
            timeout: defaultE2ETimeout - 5
        }
    )
    await result.spawnPromise
    await new Promise<void>(async (res, rej) => {
        let resolved: boolean = false
        setTimeout(async () => {
            resolved = true
            await result.kill()
            rej(new Error("Cant find started message!"))
        }, 1000 * 7)
        while (!resolved) {
            await new Promise<void>((res) => setTimeout(() => res(), 300))
            if (result.sysOut.includes("CProX| Server started!\n")) {
                resolved = true
                break
            }
        }
        res()
    })
    if (result.sysErr.length != 0) {
        throw new Error("Following error on start cprox:\n{{{\n" + result.sysErr + "\n}}}")
    }
    result.sysOut = result.sysOut.split("CProX| Server started!\n").pop() ?? ""
    return result
}

export const defaultFetchOptions = {
    timeout: 1000 * 1,
    follow: 0,
    redirect: "manual" as "manual"
}

export const defaultE2ETimeout: number = 1000 * 60 * 2
export const defaultBeforeTimeout: number = 1000 * 8
export const defaultAfterTimeout: number = 1000 * 8
export const defaultCliTimeout: number = 1000 * 16
export const defaultRequestTimeout: number = 1000 * 3

describe('Live E2E proxy webserver tests', function () {
    this.timeout(defaultE2ETimeout)
    let port: number = 55557
    let port2: number = 55558
    let result: AsyncForkResult
    let result2: AsyncForkResult

    before("Start live test server", async function () {
        this.timeout(defaultBeforeTimeout)

        const results = await Promise.all([
            startCprox([
                "-p", "" + port2,
                "-b", "127.0.0.1",
                "localhost=STATIC:" + __dirname + "/html",
                "sub.com=STATIC:" + __dirname + "/html/sub",
            ]),
            startCprox([
                "-p", "" + port,
                "-b", "127.0.0.1",
                "localhost=PROXY:http://127.0.0.1:" + port2,
                "sub.com=PROXY:http://1.1.2.3:4",
            ])
        ])

        result2 = results[0]
        result = results[1]
    })

    after(async function () {
        this.timeout(defaultAfterTimeout)
        await Promise.all([
            result.kill(),
            result2.kill()
        ])
    })

    afterEach(function () {
        expect(uniqueStringify({
            out: result.sysOut,
            err: result.sysErr,
            out2: result2.sysOut,
            err2: result2.sysErr,
        })).is.equal(uniqueStringify({
            out: "",
            err: "",
            out2: "",
            err2: "",
        }))

        expect(result.promise).is.not.undefined
        expect(result2.promise).is.not.undefined

        expect(result.code).is.null
        expect(result2.code).is.null

        expect(result.killed).is.false
        expect(result2.killed).is.false

        expect(result.spawned).is.true
        expect(result2.spawned).is.true
    })

    it('request without host', async function () {
        this.timeout(defaultRequestTimeout)
        const resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
        })).is.equals(uniqueStringify({
            status: 404,
            statusText: "Not Found",
        }))
    })

    it('request undefined host', async function () {
        this.timeout(defaultRequestTimeout)
        const resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "coreunit.net",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
        })).is.equals(uniqueStringify({
            status: 404,
            statusText: "Not Found",
        }))
    })

    it('request file on localhost', async function () {
        this.timeout(defaultRequestTimeout * 4)
        let resp: Response
        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            body: await resp.text(),
            type: resp.headers.get("content-type"),
        })).is.equals(uniqueStringify({
            status: 200,
            statusText: "OK",
            body: "hello world",
            type: "text/html; charset=UTF-8",
        }))

        resp = await fetch("http://127.0.0.1:" + port + "/index.html", {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            body: await resp.text(),
            type: resp.headers.get("content-type"),
        })).is.equals(uniqueStringify({
            status: 200,
            statusText: "OK",
            body: "hello world",
            type: "text/html; charset=UTF-8",
        }))

        resp = await fetch("http://127.0.0.1:" + port + "/test.txt", {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            body: await resp.text(),
            type: resp.headers.get("content-type"),
        })).is.equals(uniqueStringify({
            status: 200,
            statusText: "OK",
            body: "some test text file!",
            type: "text/plain; charset=UTF-8",
        }))

        resp = await fetch("http://127.0.0.1:" + port + "/sub/sub.html", {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            body: await resp.text(),
            type: resp.headers.get("content-type"),
        })).is.equals(uniqueStringify({
            status: 200,
            statusText: "OK",
            body: "sub",
            type: "text/html; charset=UTF-8",
        }))
    })

    it('request not exsiting on localhost', async function () {
        this.timeout(defaultRequestTimeout * 2)
        let resp: Response
        resp = await fetch("http://127.0.0.1:" + port + "/test.test.test.file", {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
        })).is.equals(uniqueStringify({
            status: 404,
            statusText: "Not Found",
        }))

        resp = await fetch("http://127.0.0.1:" + port + "/sub/sub.txt.file", {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
        })).is.equals(uniqueStringify({
            status: 404,
            statusText: "Not Found",
        }))
    })

    it('request file on sub.com', async function () {
        this.timeout(defaultRequestTimeout)
        let resp: Response | undefined
        let err: Error | any
        let sysErr: string
        try {
            resp = await fetch("http://127.0.0.1:" + port + "/sub.html", {
                ...defaultFetchOptions,
                headers: {
                    "Host": "sub.com",
                },
            })
        } catch (err2: Error | any) {
            err = err2
        } finally {
            sysErr = result.sysErr
            result.sysErr = ""
        }
        expect(uniqueStringify({
            resp: resp ? true : false,
            errMsg: err?.message,
            err: sysErr,
        })).is.equals(uniqueStringify({
            resp: false,
            errMsg: "network timeout at: http://127.0.0.1:55557/sub.html",
            err: [
                "{",
                "  msg: 'connect EHOSTUNREACH 1.1.2.3:4',",
                "  name: 'Error: connect EHOSTUNREACH 1.1.2.3:4',",
                "  stack: [",
                "    '    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1187:16)'",
                "  ]",
                "}",
                ""
            ].join("\n"),
        }))
    })

    it('request not found on sub.com', async function () {
        this.timeout(defaultRequestTimeout * 6)
        let resp: Response | undefined
        let err: Error | any
        let sysErr: string
        try {
            resp = await fetch("http://127.0.0.1:" + port, {
                ...defaultFetchOptions,
                headers: {
                    "Host": "sub.com",
                },
            })
        } catch (err2: Error | any) {
            err = err2
        } finally {
            sysErr = result.sysErr
            result.sysErr = ""
        }
        expect(uniqueStringify({
            resp: resp ? true : false,
            errMsg: err?.message,
            err: sysErr,
        })).is.equals(uniqueStringify({
            resp: false,
            errMsg: "network timeout at: http://127.0.0.1:55557/",
            err: [
                "{",
                "  msg: 'connect EHOSTUNREACH 1.1.2.3:4',",
                "  name: 'Error: connect EHOSTUNREACH 1.1.2.3:4',",
                "  stack: [",
                "    '    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1187:16)'",
                "  ]", "}", ""
            ].join("\n"),
        }))
    })
})

describe('Live cli', function () {
    this.timeout(defaultE2ETimeout)

    it('Cli help test', async function () {
        this.timeout(defaultCliTimeout)

        const result = await asyncFork(
            __dirname + "/../index",
            {
                args: ["--help"]
            }
        )
        await result.spawnPromise
        expect(result.promise).is.not.undefined
        await result.promise
        await result.kill()

        expect(result.code).is.equals(0)
        expect(result.sysErr.length).is.equals(0)
        expect(result.sysOut.length).is.not.equals(0)
        expect(result.sysOut).includes("# CPROX #\n")
        expect(result.sysOut).includes("Usage: cprox [OPTIONS] [ARGUMENTS]\n")
        expect(result.sysOut).includes("! CProX | by majo418 | supported by CoreUnit.NET !\n")
    })
})

describe('Live E2E load balancer webserver tests', function () {
    this.timeout(defaultE2ETimeout)
    let port: number = 55555
    let result: AsyncForkResult

    before("Start live test server", async function () {
        this.timeout(defaultBeforeTimeout)

        result = await startCprox([
            "-p", "" + port,
            "-b", "127.0.0.1",
            "localhost=REDIRECT:http://127.0.0.1:8080,http://127.0.0.1:8081,http://127.0.0.1:8082",
            "test.com=REDIRECT:http://127.0.0.1:8080,http://127.0.0.1:8081,http://127.0.0.1:8082,http://127.0.0.1:8083",
        ])
    })

    after(async function () {
        this.timeout(defaultAfterTimeout)
        await result.kill()
    })

    afterEach(function () {
        expect(uniqueStringify({
            out: result.sysOut,
            err: result.sysErr
        })).is.equal(uniqueStringify({
            out: "",
            err: ""
        }))

        expect(result.promise).is.not.undefined
        expect(result.code).is.null
        expect(result.killed).is.false
        expect(result.spawned).is.true
    })

    it('request without host', async function () {
        this.timeout(defaultRequestTimeout)
        const resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
        })).is.equals(uniqueStringify({
            status: 404,
            statusText: "Not Found",
        }))
    })


    it('request undefined host', async function () {
        this.timeout(defaultRequestTimeout)
        const resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "coreunit.net",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
        })).is.equals(uniqueStringify({
            status: 404,
            statusText: "Not Found",
        }))
    })

    it('request LB on localhost', async function () {
        this.timeout(defaultRequestTimeout * 4)
        let resp: Response
        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            location: resp.headers.get("Location")
        })).is.equals(uniqueStringify({
            status: 301,
            statusText: "Moved Permanently",
            location: "http://127.0.0.1:8080/",
        }))

        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            location: resp.headers.get("Location")
        })).is.equals(uniqueStringify({
            status: 301,
            statusText: "Moved Permanently",
            location: "http://127.0.0.1:8081/",
        }))

        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            location: resp.headers.get("Location")
        })).is.equals(uniqueStringify({
            status: 301,
            statusText: "Moved Permanently",
            location: "http://127.0.0.1:8082/",
        }))

        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            location: resp.headers.get("Location")
        })).is.equals(uniqueStringify({
            status: 301,
            statusText: "Moved Permanently",
            location: "http://127.0.0.1:8080/",
        }))
    })

    it('request LB on test.com', async function () {
        this.timeout(defaultRequestTimeout * 5)
        let resp: Response
        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "test.com",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            location: resp.headers.get("Location")
        })).is.equals(uniqueStringify({
            status: 301,
            statusText: "Moved Permanently",
            location: "http://127.0.0.1:8080/",
        }))

        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "test.com",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            location: resp.headers.get("Location")
        })).is.equals(uniqueStringify({
            status: 301,
            statusText: "Moved Permanently",
            location: "http://127.0.0.1:8081/",
        }))

        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "test.com",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            location: resp.headers.get("Location")
        })).is.equals(uniqueStringify({
            status: 301,
            statusText: "Moved Permanently",
            location: "http://127.0.0.1:8082/",
        }))

        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "test.com",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            location: resp.headers.get("Location")
        })).is.equals(uniqueStringify({
            status: 301,
            statusText: "Moved Permanently",
            location: "http://127.0.0.1:8083/",
        }))

        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "test.com",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            location: resp.headers.get("Location")
        })).is.equals(uniqueStringify({
            status: 301,
            statusText: "Moved Permanently",
            location: "http://127.0.0.1:8080/",
        }))
    })
})

describe('Live E2E static webserver tests', function () {
    this.timeout(defaultE2ETimeout)
    let port: number = 55556
    let result: AsyncForkResult

    before("Start live test server", async function () {
        this.timeout(defaultBeforeTimeout)

        result = await startCprox([
            "-p", "" + port,
            "-b", "127.0.0.1",
            "localhost=STATIC:" + __dirname + "/html",
            "sub.com=STATIC:" + __dirname + "/html/sub",
        ])
    })

    after(async function () {
        this.timeout(defaultAfterTimeout)
        await result.kill()
    })

    afterEach(function () {
        expect(uniqueStringify({
            out: result.sysOut,
            err: result.sysErr
        })).is.equal(uniqueStringify({
            out: "",
            err: ""
        }))

        expect(result.promise).is.not.undefined
        expect(result.code).is.null
        expect(result.killed).is.false
        expect(result.spawned).is.true
    })

    it('request without host', async function () {
        this.timeout(defaultRequestTimeout)
        const resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
        })).is.equals(uniqueStringify({
            status: 404,
            statusText: "Not Found",
        }))
    })

    it('request undefined host', async function () {
        this.timeout(defaultRequestTimeout)
        const resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "coreunit.net",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
        })).is.equals(uniqueStringify({
            status: 404,
            statusText: "Not Found",
        }))
    })

    it('request file on localhost', async function () {
        this.timeout(defaultRequestTimeout * 4)
        let resp: Response
        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            body: await resp.text(),
            type: resp.headers.get("content-type"),
        })).is.equals(uniqueStringify({
            status: 200,
            statusText: "OK",
            body: "hello world",
            type: "text/html; charset=UTF-8",
        }))

        resp = await fetch("http://127.0.0.1:" + port + "/index.html", {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            body: await resp.text(),
            type: resp.headers.get("content-type"),
        })).is.equals(uniqueStringify({
            status: 200,
            statusText: "OK",
            body: "hello world",
            type: "text/html; charset=UTF-8",
        }))

        resp = await fetch("http://127.0.0.1:" + port + "/test.txt", {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            body: await resp.text(),
            type: resp.headers.get("content-type"),
        })).is.equals(uniqueStringify({
            status: 200,
            statusText: "OK",
            body: "some test text file!",
            type: "text/plain; charset=UTF-8",
        }))

        resp = await fetch("http://127.0.0.1:" + port + "/sub/sub.html", {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            body: await resp.text(),
            type: resp.headers.get("content-type"),
        })).is.equals(uniqueStringify({
            status: 200,
            statusText: "OK",
            body: "sub",
            type: "text/html; charset=UTF-8",
        }))
    })

    it('request not exsiting on localhost', async function () {
        this.timeout(defaultRequestTimeout * 2)
        let resp: Response
        resp = await fetch("http://127.0.0.1:" + port + "/test.test.test.file", {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
        })).is.equals(uniqueStringify({
            status: 404,
            statusText: "Not Found",
        }))

        resp = await fetch("http://127.0.0.1:" + port + "/sub/sub.txt.file", {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
        })).is.equals(uniqueStringify({
            status: 404,
            statusText: "Not Found",
        }))
    })

    it('request file on sub.com', async function () {
        this.timeout(defaultRequestTimeout)
        let resp: Response
        resp = await fetch("http://127.0.0.1:" + port + "/sub.html", {
            ...defaultFetchOptions,
            headers: {
                "Host": "sub.com",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            body: await resp.text(),
            type: resp.headers.get("content-type"),
        })).is.equals(uniqueStringify({
            status: 200,
            statusText: "OK",
            body: "sub",
            type: "text/html; charset=UTF-8",
        }))
    })

    it('request not found on sub.com', async function () {
        this.timeout(defaultRequestTimeout * 6)
        let resp: Response
        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "sub.com",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
        })).is.equals(uniqueStringify({
            status: 404,
            statusText: "Not Found",
        }))

        resp = await fetch("http://127.0.0.1:" + port + "/index.html", {
            ...defaultFetchOptions,
            headers: {
                "Host": "sub.com",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
        })).is.equals(uniqueStringify({
            status: 404,
            statusText: "Not Found",
        }))

        resp = await fetch("http://127.0.0.1:" + port + "/test.html", {
            ...defaultFetchOptions,
            headers: {
                "Host": "sub.com",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
        })).is.equals(uniqueStringify({
            status: 404,
            statusText: "Not Found",
        }))

        resp = await fetch("http://127.0.0.1:" + port + "/test.test.test.file", {
            ...defaultFetchOptions,
            headers: {
                "Host": "sub.com",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
        })).is.equals(uniqueStringify({
            status: 404,
            statusText: "Not Found",
        }))

        resp = await fetch("http://127.0.0.1:" + port + "/sub/sub.txt.file", {
            ...defaultFetchOptions,
            headers: {
                "Host": "sub.com",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
        })).is.equals(uniqueStringify({
            status: 404,
            statusText: "Not Found",
        }))

        resp = await fetch("http://127.0.0.1:" + port + "/sub/sub.html", {
            ...defaultFetchOptions,
            headers: {
                "Host": "sub.com",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
        })).is.equals(uniqueStringify({
            status: 404,
            statusText: "Not Found",
        }))
    })
})
