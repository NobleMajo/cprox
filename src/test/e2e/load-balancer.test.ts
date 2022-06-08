import 'mocha';
import { expect } from 'chai'
import { after, before } from 'mocha'
import fetch, { Response } from 'node-fetch'
import { uniqueStringify } from '../../json'
import {
    AsyncForkResult, defaultAfterTimeout,
    defaultBeforeTimeout, defaultE2ETimeout,
    defaultFetchOptions, defaultRequestTimeout,
    startCprox
} from '../e2e'

describe('Live E2E load balancer webserver tests', function () {
    this.timeout(defaultE2ETimeout)
    let port: number =  (60600 + 2)
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
        result && await result.close()
    })

    afterEach(function () {
        expect(uniqueStringify({
            out: result.getStdOutput(),
            err: result.getErrOutput()
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
