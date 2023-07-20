import { expect } from 'chai';
import { uniqueStringify } from "majotools/dist/json";
import 'mocha';
import { after, before } from 'mocha';
import fetch from 'node-fetch';
import {
    AsyncForkResult, defaultAfterTimeout,
    defaultBeforeTimeout, defaultE2ETimeout,
    defaultFetchOptions,
    defaultTestTimeout,
    getRandomTestPort,
    startCprox
} from '../e2e';

describe('Live E2E http to https redirect tests', function () {
    this.timeout(defaultE2ETimeout)
    let httpPort: number
    let httpsPort: number
    let result: AsyncForkResult

    before("Start live test server", async function () {
        this.timeout(defaultBeforeTimeout)

        httpPort = getRandomTestPort()
        httpsPort = getRandomTestPort()

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
        const output = "Output:\n" + result.getOutput()
        expect(
            uniqueStringify({
                out: result.getStdOutput(undefined, ""),
                err: result.getErrOutput(undefined, ""),
            }),
            output
        ).is.equal(uniqueStringify({
            out: "",
            err: ""
        }))

        expect(result.promise, output).is.not.undefined
        expect(result.code, output).is.null
        expect(result.killed, output).is.false
        expect(result.spawned, output).is.true
    })

    it('request without host', async function () {
        this.timeout(defaultTestTimeout)
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
