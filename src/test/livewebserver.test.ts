import 'mocha';
import { expect } from 'chai'
import { ChildProcess, fork } from 'child_process';
import { after, before } from 'mocha';
import fetch, { Response } from 'node-fetch';

export interface AsyncForkResult {
    spawned: boolean,
    closed: boolean,
    killed: boolean,
    sysOut: string,
    sysErr: string,
    spawnPromise: Promise<void>,
    closePromise: Promise<void> | null,
    child: ChildProcess,
    code: number | null,
    close: () => void
}

export class AsyncForkError extends Error {
    constructor(
        msg: string,
        public result: AsyncForkResult,
    ) {
        super(msg)
    }
}

export async function asyncFork(
    modulePath: string,
    args: string[],
    spawnTimeout: number = 1000 * 3,
    closeTimeout: number = 1000 * 5,
): Promise<AsyncForkResult> {
    try {
        const child = fork(modulePath, args, {
            execArgv: ["node_modules/ts-node/dist/bin.js"],
            silent: true,
        })

        const result: AsyncForkResult = {
            spawned: false,
            closed: false,
            killed: false,
            sysOut: "",
            sysErr: "",
            code: null,
            child: child,
            spawnPromise: undefined as any,
            closePromise: null,
            close: () => {
                child.kill(9)
                result.closed = true
                result.killed = true
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
        child.stdout.on('data', (data) => {
            result.sysOut += data
        })
        child.stderr.on('data', (data) => {
            result.sysErr += data
        })
        result.spawnPromise = new Promise<void>((res, rej) => {
            child.on(
                'spawn',
                () => {
                    result.spawned = true
                    result.closePromise = new Promise<void>((res, rej) => {
                        child.on(
                            'close',
                            (code) => {
                                result.code = code
                                result.closed = true
                                res()
                            }
                        )
                        setTimeout(
                            () => rej(
                                new AsyncForkError(
                                    "Child close process timeout!",
                                    result
                                )
                            ),
                            closeTimeout
                        )
                    }).then(() => {
                        if (!result.closed) {
                            child.kill(9)
                            result.closed = true
                            result.killed = true
                        }
                    })
                    res()
                }
            )
            setTimeout(
                () => rej(
                    new AsyncForkError(
                        "Child spawn process timeout!",
                        result
                    )
                ),
                spawnTimeout
            )
        })
        return result
    } catch (err) {
        throw err
    }
}

describe('Live cli', () => {
    it('Cli help test', async () => {
        const result = await asyncFork(
            __dirname + "/../index",
            ["--help"]
        )
        await result.spawnPromise
        expect(result.closePromise).is.not.undefined
        await result.closePromise

        expect(result.code).is.equals(0)
        expect(result.sysErr.length).is.equals(0)
        expect(result.sysOut.length).is.not.equals(0)
        expect(result.sysOut.length).is.greaterThan(100)
        expect(result.sysOut.startsWith("# CPROX #\n\nUsage: cprox [OPTIONS] [ARGUMENTS]\n\n")).is.true
        expect(result.sysOut.endsWith("\n! CProX | by majo418 | supported by CoreUnit.NET !\n")).is.true
    }).timeout(1000 * 10)
})

describe('Live webserver', () => {
    let result: AsyncForkResult

    before("Start live test server", async function () {
        //@ts-ignore
        this.timeout(1000 * 8)

        result = await asyncFork(
            __dirname + "/../index",
            [
                "-p", "55555",
                "-b", "127.0.0.1",
                "localhost=REDIRECT:http://127.0.0.1:8080,http://127.0.0.1:8081,http://127.0.0.1:8082",
                "test.com=REDIRECT:http://127.0.0.1:8080,http://127.0.0.1:8081,http://127.0.0.1:8082,http://127.0.0.1:8083",
            ]
        )
        await result.spawnPromise

        await new Promise<void>(async (res, rej) => {
            let resolved: boolean = false
            setTimeout(() => {
                resolved = true
                rej(new Error("Cant find started message!"))
            }, 1000 * 5)
            while (!resolved) {
                await new Promise<void>((res, rej) => setTimeout(() => res(), 300))
                if (result.sysOut.includes("CProX| Server started!")) {
                    console.log("found!")
                    resolved = true
                    break
                }
            }
            res()
        })
    })

    beforeEach(async () => {
        expect(result.closePromise).is.not.undefined
        expect(result.code).is.null
        expect(result.closed).is.false
        expect(result.spawned).is.true
        expect(result.killed).is.false
    })

    it('E2E http without host', async () => {
        const resp = await fetch("http://127.0.0.1:55555", {
            follow: 0,
            redirect: "manual",
        })
        expect(resp.status).is.equals(404)
    }).timeout(1000 * 2)

    it('E2E http with undefined host', async () => {
        const resp = await fetch("http://127.0.0.1:55555", {
            follow: 0,
            redirect: "manual",
            headers: {
                "Host": "coreunit.net",
            },
        })
        expect(resp.status).is.equals(404)
    }).timeout(1000 * 2)

    it('E2E http with defined host', async () => {
        let resp: Response
        resp = await fetch("http://127.0.0.1:55555", {
            follow: 0,
            redirect: "manual",
            headers: {
                "Host": "localhost",
            },
        })
        expect(resp.status).is.equals(301)
        expect(resp.statusText).is.equals("Moved Permanently")
        expect(resp.headers.get("Location")).is.equals("http://127.0.0.1:8080/")

        resp = await fetch("http://127.0.0.1:55555", {
            follow: 0,
            redirect: "manual",
            headers: {
                "Host": "localhost",
            },
        })
        expect(resp.status).is.equals(301)
        expect(resp.statusText).is.equals("Moved Permanently")
        expect(resp.headers.get("Location")).is.equals("http://127.0.0.1:8081/")

        resp = await fetch("http://127.0.0.1:55555", {
            follow: 0,
            redirect: "manual",
            headers: {
                "Host": "localhost",
            },
        })
        expect(resp.status).is.equals(301)
        expect(resp.statusText).is.equals("Moved Permanently")
        expect(resp.headers.get("Location")).is.equals("http://127.0.0.1:8082/")

        resp = await fetch("http://127.0.0.1:55555", {
            follow: 0,
            redirect: "manual",
            headers: {
                "Host": "localhost",
            },
        })
        expect(resp.status).is.equals(301)
        expect(resp.statusText).is.equals("Moved Permanently")
        expect(resp.headers.get("Location")).is.equals("http://127.0.0.1:8080/")
    }).timeout(1000 * 2 * 4)


    after(async () => {
        expect(result.closePromise).is.not.undefined
        expect(result.code).is.null
        expect(result.closed).is.false
        expect(result.spawned).is.true
        expect(result.killed).is.false
        result.close()
        await result.closePromise
        expect(result.closed).is.true
        expect(result.spawned).is.true
        expect(result.killed).is.true
    })
})
    .timeout(1000 * 60 * 1)