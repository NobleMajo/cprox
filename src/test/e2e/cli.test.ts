import 'mocha';
import { expect } from 'chai'
import {
    defaultE2ETimeout, defaultCliTimeout,
    asyncFork,
} from '../e2e'

describe('Live cli', function () {
    this.timeout(defaultE2ETimeout)

    it('Cli help test', async function () {
        this.timeout(defaultCliTimeout)

        const result = await asyncFork(
            __dirname + "/../../index",
            {
                args: ["--help"]
            }
        )
        await result.spawnPromise
        expect(result.promise).is.not.undefined
        await result.promise
        await result.close()

        expect(result.code).is.equals(0)
        expect(result.getErrOutput()).is.equals("")
        expect(result.getStdOutput().length).is.not.equals(0)
        expect(result.getStdOutput()).includes("# CPROX #")
        expect(result.getStdOutput()).includes("Usage: cprox [OPTIONS] [ARGUMENTS]")
        expect(result.getStdOutput()).includes("! CProX | by majo418 | supported by CoreUnit.NET !")
    })
})
