import 'mocha';
import { expect } from 'chai'
import { after, before } from 'mocha'
import fetch from 'node-fetch'
import {
    AsyncForkResult, defaultAfterTimeout,
    defaultBeforeTimeout, defaultE2ETimeout,
    defaultFetchOptions, defaultRequestTimeout,
    getNewPort,
    startCprox
} from '../e2e'
import { uniqueStringify } from "majotools/dist/json"

describe('Live E2E http to https redirect tests', function () {
    this.timeout(defaultE2ETimeout)
    let httpPort: number = getNewPort()
    let httpsPort: number = getNewPort()
    let result: AsyncForkResult

    before("Start live test server", async function () {
        this.timeout(defaultBeforeTimeout)

        result = await startCprox([
            "-p", "" + httpPort,
            "-s", "" + httpsPort,
            "-b", "127.0.0.1",
            "localhost=STATIC:" + __dirname + "/../html",
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
            err: ""
        }))

        expect(result.promise).is.not.undefined
        expect(result.code).is.null
        expect(result.killed).is.false
        expect(result.spawned).is.true
    })

    it('request without host', async function () {
        this.timeout(defaultRequestTimeout)
        const resp = await fetch("http://127.0.0.1:" + httpPort, {
            ...defaultFetchOptions,
        })
        expect(uniqueStringify({
            status: resp.status,
            statusText: resp.statusText,
            location: resp.headers.get("location")
        })).is.equals(uniqueStringify({
            status: 301,
            statusText: "Moved Permanently",
            location: "https://127.0.0.1:" + httpPort + "/"
        }))
    })
})
