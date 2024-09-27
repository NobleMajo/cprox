import { expect } from 'chai';
import { uniqueStringify } from "majotools/dist/json";
import 'mocha';
import { after, before } from 'mocha';
import fetch, { Response } from "node-fetch";
import {
    AsyncForkResult, defaultAfterTimeout,
    defaultBeforeTimeout,
    defaultCliTimeout,
    defaultE2ETimeout,
    defaultFetchOptions,
    defaultTestTimeout,
    getLogMessage,
    getRandomTestPort,
    startCprox
} from '../e2e';

describe('Live E2E load balancer webserver tests', function () {
    this.timeout(defaultE2ETimeout)
    let port: number
    let result: AsyncForkResult

    before("Start live test server", async function () {
        this.timeout(defaultBeforeTimeout)

        port = getRandomTestPort()

        result = await startCprox([
            "-p", "" + port,
            "-b", "127.0.0.1",
            "localhost=REDIRECT:http://127.0.0.1:8080,http://127.0.0.1:8081,http://127.0.0.1:8082",
            "test.com=REDIRECT:http://127.0.0.1:8080,http://127.0.0.1:8081,http://127.0.0.1:8082,http://127.0.0.1:8083",
        ], defaultCliTimeout)
    })

    after(async function () {
        this.timeout(defaultAfterTimeout)
        result && await result.close()
    })

    afterEach(function () {
        expect(
            result.getOutput(),
            getLogMessage(result)
        ).is.equal("")

        expect(
            result.promise,
            getLogMessage(result)
        ).is.not.undefined
        expect(
            result.code,
            getLogMessage(result)
        ).is.null
        expect(
            result.killed,
            getLogMessage(result)
        ).is.false
        expect(
            result.spawned,
            getLogMessage(result)
        ).is.true
    })

    it('request without host', async function () {
        this.timeout(defaultTestTimeout)
        const resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
        })

        expect(
            resp.status,
            getLogMessage(result, resp)
        ).is.equals(404)
        expect(
            resp.statusText,
            getLogMessage(result, resp)
        ).is.equals("Not Found")
    })


    it('request undefined host', async function () {
        this.timeout(defaultTestTimeout)
        const resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "coreunit.net",
            },
        })

        expect(
            resp.status,
            getLogMessage(result, resp)
        ).is.equals(404)
        expect(
            resp.statusText,
            getLogMessage(result, resp)
        ).is.equals("Not Found")
    })

    it('request LB on localhost', async function () {
        this.timeout(defaultTestTimeout * 4)
        let resp: Response
        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })

        expect(
            resp.status,
            getLogMessage(result, resp)
        ).is.equals(301)
        expect(
            resp.statusText,
            getLogMessage(result, resp)
        ).is.equals("Moved Permanently")
        expect(
            resp.headers.get("location"),
            getLogMessage(result, resp)
        ).is.equals(
            "http://127.0.0.1:8080/"
        )

        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })

        expect(
            resp.status,
            getLogMessage(result, resp)
        ).is.equals(301)
        expect(
            resp.statusText,
            getLogMessage(result, resp)
        ).is.equals("Moved Permanently")
        expect(
            resp.headers.get("location"),
            getLogMessage(result, resp)
        ).is.equals(
            "http://127.0.0.1:8081/"
        )

        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })

        expect(
            resp.status,
            getLogMessage(result, resp)
        ).is.equals(301)
        expect(
            resp.statusText,
            getLogMessage(result, resp)
        ).is.equals("Moved Permanently")
        expect(
            resp.headers.get("location"),
            getLogMessage(result, resp)
        ).is.equals(
            "http://127.0.0.1:8082/"
        )

        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "localhost",
            },
        })
        expect(
            resp.status,
            getLogMessage(result, resp)
        ).is.equals(301)
        expect(
            resp.statusText,
            getLogMessage(result, resp)
        ).is.equals("Moved Permanently")
        expect(
            resp.headers.get("location"),
            getLogMessage(result, resp)
        ).is.equals(
            "http://127.0.0.1:8080/"
        )
    })

    it('request LB on test.com', async function () {
        this.timeout(defaultTestTimeout * 5)
        let resp: Response
        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "test.com",
            },
        })
        expect(
            resp.status,
            getLogMessage(result, resp)
        ).is.equals(301)
        expect(
            resp.statusText,
            getLogMessage(result, resp)
        ).is.equals("Moved Permanently")
        expect(
            resp.headers.get("location"),
            getLogMessage(result, resp)
        ).is.equals(
            "http://127.0.0.1:8080/"
        )

        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "test.com",
            },
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            location: resp.headers.get("location")
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

        expect(
            resp.status,
            getLogMessage(result, resp)
        ).is.equals(301)
        expect(
            resp.statusText,
            getLogMessage(result, resp)
        ).is.equals("Moved Permanently")
        expect(
            resp.headers.get("location"),
            getLogMessage(result, resp)
        ).is.equals(
            "http://127.0.0.1:8082/"
        )

        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "test.com",
            },
        })

        expect(
            resp.status,
            getLogMessage(result, resp)
        ).is.equals(301)
        expect(
            resp.statusText,
            getLogMessage(result, resp)
        ).is.equals("Moved Permanently")
        expect(
            resp.headers.get("location"),
            getLogMessage(result, resp)
        ).is.equals(
            "http://127.0.0.1:8083/"
        )

        resp = await fetch("http://127.0.0.1:" + port, {
            ...defaultFetchOptions,
            headers: {
                "Host": "test.com",
            },
        })

        expect(
            resp.status,
            getLogMessage(result, resp)
        ).is.equals(301)
        expect(
            resp.statusText,
            getLogMessage(result, resp)
        ).is.equals("Moved Permanently")
        expect(
            resp.headers.get("location"),
            getLogMessage(result, resp)
        ).is.equals(
            "http://127.0.0.1:8080/"
        )
    })
})
