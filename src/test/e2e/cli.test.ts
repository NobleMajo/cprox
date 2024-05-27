import { expect } from 'chai';
import 'mocha';
import {
    asyncFork,
    defaultCliTimeout,
    defaultE2ETimeout,
} from '../e2e';

describe('Live cli', function () {
    this.timeout(defaultE2ETimeout)

    it('Cli help test', async function () {
        this.timeout(defaultCliTimeout)

        const result = await asyncFork(
            __dirname + "/../../index",
            {
                args: ["--help"],
                closeTimeout: defaultCliTimeout - 2000,
            }
        )
        await result.spawnPromise
        expect(result.promise).is.not.undefined
        await result.promise
        await result.close()

        const err = result.getErrOutput(undefined, "  ")
        const std = result.getStdOutput(undefined, "  ")
        const out = "Output:\n" + result.getOutput()

        expect(err, out).is.equals("")
        expect(std.length, out).is.not.equals(0)
        expect(std, out).not.includes("CProX| Exit because started in 'dry-run' mode!")
        expect(std, out).includes("# CPROX #")
        expect(std, out).includes("Usage: cprox [OPTIONS] COMMAND [ARGUMENTS]")
        expect(std, out).includes("! CProX | by majo418 | supported by CoreUnit.NET !")
        expect(result.code, out).is.equals(0)
    })

    it('Cli dry run test', async function () {
        this.timeout(defaultCliTimeout)

        const result = await asyncFork(
            __dirname + "/../../index",
            {
                args: [
                    "--dry-run",
                    "*=STATIC:/var/www/html"
                ],
                closeTimeout: defaultCliTimeout - 2000,
            }
        )
        await result.spawnPromise
        expect(result.promise).is.not.undefined
        await result.promise
        await result.close()

        const err = result.getErrOutput(undefined, "  ")
        const std = result.getStdOutput(undefined, "  ")
        const out = "Output:\n" + result.getOutput()

        expect(err, out).is.equals("")
        expect(std.length, out).is.not.equals(0)

        expect(err, out).is.equals("")
        expect(std, out).includes("CProX| Exit because started in 'dry-run' mode!")
        expect(std, out).not.includes("# CPROX #")
        expect(std, out).not.includes("Usage: cprox [OPTIONS] [ARGUMENTS]")
        expect(std, out).not.includes("! CProX | by majo418 | supported by CoreUnit.NET !")
        expect(result.code, out).is.equals(0)
    })
})
