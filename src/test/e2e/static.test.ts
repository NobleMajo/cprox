import { expect } from 'chai';
import { uniqueStringify } from "majotools/dist/json";
import 'mocha';
import { after, before } from 'mocha';
import fetch, { Response } from 'node-fetch';
import {
    AsyncForkResult, defaultAfterTimeout,
    defaultBeforeTimeout, defaultE2ETimeout,
    defaultFetchOptions, defaultTestTimeout,
    getRandomTestPort,
    startCprox
} from '../e2e';

describe('Live E2E static webserver tests', function () {
    this.timeout(defaultE2ETimeout)
    let port: number
    let result: AsyncForkResult

    before("Start live test server", async function () {
        this.timeout(defaultBeforeTimeout)

        port = getRandomTestPort()
        result = await startCprox([
            "-p", "" + port,
            "-b", "127.0.0.1",
            "localhost=STATIC:" + __dirname + "/../html",
            "sub.com=STATIC:" + __dirname + "/../html/sub",
        ])
    })

    after(async function () {
        this.timeout(defaultAfterTimeout)
        result && await result.close()
    })

    afterEach(function () {
        expect(uniqueStringify({
            out: result.getStdOutput(),
            err: result.getErrOutput(),
        })).is.equal(uniqueStringify({
            out: "",
            err: "",
        }))

        expect(result.promise).is.not.undefined
        expect(result.code).is.null
        expect(result.killed).is.false
        expect(result.spawned).is.true
    })

    it('request without host', async function () {
        this.timeout(defaultTestTimeout)
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
        this.timeout(defaultTestTimeout)
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
        this.timeout(defaultTestTimeout * 4)
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
        this.timeout(defaultTestTimeout * 2)
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
})
