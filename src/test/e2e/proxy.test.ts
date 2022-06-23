import 'mocha';
import { expect } from 'chai'
import { after, before } from 'mocha'
import fetch, { Response } from 'node-fetch'
import {
    AsyncForkResult, defaultAfterTimeout,
    defaultBeforeTimeout, defaultE2ETimeout,
    defaultFetchOptions, defaultRequestTimeout,
    getNewPort,
    startCprox
} from '../e2e'
import { uniqueStringify } from "majotools/dist/json"

describe('Live E2E proxy webserver tests', function () {
    this.timeout(defaultE2ETimeout)
    let port: number = getNewPort()
    let port2: number = getNewPort()
    let result: AsyncForkResult
    let result2: AsyncForkResult

    before("Start live test server", async function () {
        this.timeout(defaultBeforeTimeout)

        const p1 = startCprox([
            "-p", "" + port,
            "-b", "127.0.0.1",
            "localhost=PROXY:http://127.0.0.1:" + port2,
            "sub.com=PROXY:http://127.0.0.1:50404",
        ])
        const p2 = startCprox([
            "-p", "" + port2,
            "-b", "127.0.0.1",
            "localhost=STATIC:" + __dirname + "/../html",
            "sub.com=STATIC:" + __dirname + "/../html/sub",
        ])

        result2 = await p2
        result = await p1
    })

    after(async function () {
        this.timeout(defaultAfterTimeout)
        await Promise.all([
            result && result.close(),
            result2 && result2.close()
        ])
    })

    afterEach(function () {
        expect(uniqueStringify({
            out: result.getOutput(undefined, ""),
            out2: result2.getOutput(undefined, ""),
        })).is.equal(uniqueStringify({
            out: "",
            out2: "",
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
            sysErr = result.getErrOutput()
            result.output = []
        }
        expect(uniqueStringify({
            resp: resp ? true : false,
            errMsg: typeof err.message == "string" && err.message.length > 0,
            err: typeof sysErr == "string" && sysErr.length > 0,
        })).is.equals(uniqueStringify({
            resp: false,
            errMsg: true,
            err: true
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
            sysErr = result.getErrOutput()
            result.output = []
        }
        expect(uniqueStringify({
            resp: resp ? true : false,
            errMsg: typeof err.message == "string" && err.message.length > 0,
            err: typeof sysErr == "string" && sysErr.length > 0,
        })).is.equals(uniqueStringify({
            resp: false,
            errMsg: true,
            err: true
        }))
    })
})
