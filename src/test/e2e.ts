import { ChildProcess, fork } from "child_process"

export interface AsyncForkResult {
    spawned: boolean,
    getStdOutput: (lastLines?: number) => string,
    getErrOutput: (lastLines?: number) => string,
    getOutput: (lastLines?: number) => string,
    output: [boolean, string][],
    spawnPromise: Promise<void>,
    promise: Promise<void> | null,
    closePromise: Promise<void> | null,
    child: ChildProcess,
    code: number | null,
    killed: boolean,
    closing: boolean,
    closed: boolean,
    close: () => Promise<void>,
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
    spawnTimeout: 1000 * 4,
    timeout: 1000 * 8,
    closeTimeout: 1000 * 4,
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
            getErrOutput(
                lastLines?: number,
                prefix: string = " ERR|",
            ): string {
                let err = result.output
                    .filter((v) => v[0] == true)
                    .map((v) => prefix + v[1])
                if (lastLines && lastLines > 0) {
                    err = err.slice(-lastLines)
                }
                return err.join("\n")
            },
            getStdOutput(
                lastLines?: number,
                prefix: string = " STD|",
            ): string {
                let err = result.output
                    .filter((v) => v[0] != true)
                    .map((v) => prefix + v[1])
                if (lastLines && lastLines > 0) {
                    err = err.slice(-lastLines)
                }
                return err.join("\n")
            },
            getOutput(
                lastLines?: number,
                stdLinePrefix: string = " STD|",
                errorLinePrefix: string = " ERR|",
            ): string {
                let err = result.output
                    .map(
                        (v) => (
                            v[0] == true ?
                                errorLinePrefix :
                                stdLinePrefix
                        ) + v[1]
                    )
                if (lastLines && lastLines > 0) {
                    err = err.slice(-lastLines)
                }
                return err.join("\n")
            },
            output: [],
            code: null,
            child: child,
            spawnPromise: undefined as any,
            promise: null,
            closePromise: null,
            killed: false,
            closing: false,
            closed: false,
            close: () => {
                if (result.closePromise) {
                    return result.closePromise
                }
                if (result.closed) {
                    result.closePromise = new Promise<void>((res) => res())
                    return result.closePromise
                }

                result.closing = true
                result.closePromise = new Promise<void>((res, rej) => {
                    child.on('close', () => res())
                    if (result.killed) {
                        res()
                        return
                    }
                    if (settings.closeTimeout > 0) {
                        setTimeout(
                            () => {
                                child.kill(9)
                                result.closing = false
                                result.closed = true
                                rej(
                                    new AsyncForkError(
                                        "Timeout while wait for async process fork",
                                        result
                                    )
                                )
                            },
                            settings.closeTimeout
                        )
                    }
                    child.kill(15)
                })
                return result.closePromise
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
            let last: string = ""
            if (
                result.output.length > 0 &&
                result.output[result.output.length - 1][0] != true
            ) {
                last = (result.output.pop() as [boolean, string])[1]
            } else {
                for (
                    let index = result.output.length - 2;
                    index > result.output.length;
                    index--
                ) {
                    if (result.output[index][0] != true) {
                        last = result.output[index][1]
                        result.output = [
                            ...result.output.slice(0, index),
                            ...result.output.slice(index + 1)
                        ]
                        break
                    }
                }
            }
            for (const line of (last + data.toString("utf-8")).split("\n")) {
                result.output.push([false, line])
            }
        })
        child.stderr.on('data', (data: Buffer) => {
            let last: string = ""
            if (
                result.output.length > 0 &&
                result.output[result.output.length - 1][0] == true
            ) {
                last = (result.output.pop() as [boolean, string])[1]
            } else {
                for (
                    let index = result.output.length - 2;
                    index > result.output.length;
                    index--
                ) {
                    if (result.output[index][0] == true) {
                        last = result.output[index][1]
                        result.output = [
                            ...result.output.slice(0, index),
                            ...result.output.slice(index + 1)
                        ]
                        break
                    }
                }
            }
            for (const line of (last + data.toString("utf-8")).split("\n")) {
                result.output.push([true, line])
            }
        })

        child.on('close', (code) => {
            result.code = code
            result.closing = false
            result.closed = true
        })
        child.on('spawn', () => {
            result.spawned = true
        })

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
                            await result.close()
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
        child.on('spawn', () => {
            result.spawned = true
        })
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

export function asyncSleep(millis: number): Promise<void> {
    return new Promise<void>((res) => setTimeout(() => res(), millis))
}

export async function startCprox(
    args: string[],
    timeoutMillis: number = 1000 * 8,
    checkIntervalMillis: number = 200,
): Promise<AsyncForkResult> {
    if (timeoutMillis < 100) {
        throw new Error("CProX needs minimum 100 millis to start!")
    }
    if (checkIntervalMillis >= timeoutMillis) {
        checkIntervalMillis = Math.round((timeoutMillis - 10) / 2)
    }
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
            await result.close()
            rej(new Error(
                "Can't find started message!\n" +
                (
                    result.output.length == 0 ?
                        "No error or standard output!" :
                        "Last output:\n" + result.getOutput(32)
                )
            ))
        }, timeoutMillis)
        while (!resolved) {
            await asyncSleep(checkIntervalMillis)
            if (result.getStdOutput().includes("CProX| Server started!")) {
                resolved = true
                break
            }
        }
        res()
    })
    if (result.getErrOutput().length != 0) {
        throw new Error("Following error on start cprox:\nError output:\n" + result.getErrOutput())
    }
    result.output = []
    return result
}

export const defaultFetchOptions = {
    timeout: 1000 * 1,
    follow: 0,
    redirect: "manual" as "manual"
}

export const defaultE2ETimeout: number = 1000 * 60 * 2
export const defaultBeforeTimeout: number = 1000 * 16
export const defaultAfterTimeout: number = 1000 * 16
export const defaultCliTimeout: number = 1000 * 32
export const defaultRequestTimeout: number = 1000 * 4