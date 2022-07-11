import 'mocha';
import { expect } from 'chai'
import {
    defaultE2ETimeout, defaultCliTimeout,
    asyncFork,
} from '../e2e'
import { uniqueStringify } from "majotools/dist/json"
import { getNewPort } from '../e2e';

describe('Live env', function () {
    this.timeout(defaultE2ETimeout)

    it('Check verbose envtionment variable', async function () {
        this.timeout(defaultCliTimeout)

        const result = await asyncFork(
            __dirname + "/../../index",
            {
                args: [
                    "--dry-run",
                    "*=STATIC:/var/www/html"
                ],
                env: {
                    "VERBOSE": "true",
                }
            }
        )
        await result.spawnPromise
        expect(result.promise).is.not.undefined
        await result.promise
        await result.close()

        const err = result.getErrOutput(undefined, "")
        const std = result.getStdOutput(undefined, "")
        const out = "Output:\n" + result.getOutput()

        expect(err, out).is.equals("")
        expect(std, out).is.not.equals("")

        const envStartIndex = std.indexOf("ENV: {")
        expect(
            envStartIndex,
            "Can't find 'ENV: {' in output:\n" + std
        ).is.not.equals(-1)

        const envEndIndex = std.lastIndexOf("}")
        expect(
            envEndIndex,
            "Can't find '}' after 'ENV: {' in output:\n" + std
        ).is.not.equals(-1)

        const envString = std.substring(
            envStartIndex + 5,
            envEndIndex + 1
        )
        let env
        try {
            env = JSON.parse(envString)
        } catch (err: Error | any) {
            err.message = "Can't parse env strean: '\n" + envString + "\n'\n\n" + err.message
            throw err
        }
        expect(
            uniqueStringify({
                ...env,
                CERT_PATH: "?" + env.CERT_PATH.substring(env.CERT_PATH.lastIndexOf("cprox"))
            }),
            "Actual env was: " + JSON.stringify(env, null, 2) + "\n" + out
        ).is.equals(uniqueStringify({
            "PRODUCTION": false,
            "VERBOSE": true,
            "DRYRUN": true,
            "TRUST_ALL_CERTS": false,
            "DNS_SERVER_ADDRESSES": [
                "127.0.0.11",
                "1.0.0.1",
                "8.8.4.4",
                "1.1.1.1",
                "8.8.8.8"
            ],
            "HTTP_PORT": 80,
            "HTTPS_PORT": 443,
            "BIND_ADDRESS": "0.0.0.0",
            "CERT_PATH": "?cprox/.store/certs",
            "CERT_NAME": "cert.pem",
            "KEY_NAME": "privkey.pem",
            "CA_NAME": "chain.pem",
            "DISABLE_SELF_SINGED": false,
            "SELF_SINGED_COMMON_DOMAIN_NAME": "example.com",
            "SELF_SINGED_COUNTRY_CODE": "INT",
            "SELF_SINGED_STATE_NAME": "International",
            "SELF_SINGED_LOCALITY_NAME": "International",
            "SELF_SINGED_ORGANIZATION_NAME": "None",
            "SELF_SINGED_EMAIL_ADDRESS": "none@example.com",
            "SELF_SINGED_NETSCAPE_COMMENT": "Self-Singed SSL Certificate by the CProX Server Software",
            "MAX_HEADER_SIZE": 4096,
            "CONNECTION_TIMEOUT": 15000,
            "PROXY_CONNECTION_TIMEOUT": 120000,
            "PROXY_REACTION_TIMEOUT": 3000,
            "PROXY_VERIFY_CERTIFICATE": false,
            "PROXY_FOLLOW_REDIRECTS": false
        }))
        expect(result.code, out).is.equals(0)
    })

    it('Check extra envtionment variables', async function () {
        this.timeout(defaultCliTimeout)

        const result = await asyncFork(
            __dirname + "/../../index",
            {
                args: [
                    "--verbose",
                    "*=STATIC:/var/www/html"
                ],
                env: {
                    "DRYRUN": "true",
                    "TRUST_ALL_CERTS": "true",
                    "SELF_SINGED_DOMAIN": "test.com",
                }
            }
        )
        await result.spawnPromise
        expect(result.promise).is.not.undefined
        await result.promise
        await result.close()

        const err = result.getErrOutput(undefined, "")
        const std = result.getStdOutput(undefined, "")
        const out = "Output:\n" + result.getOutput()

        expect(err, out).is.equals("")
        expect(std, out).is.not.equals("")

        const envStartIndex = std.indexOf("ENV: {")
        expect(
            envStartIndex,
            "Can't find 'ENV: {' in output:\n" + std
        ).is.not.equals(-1)

        const envEndIndex = std.lastIndexOf("}")
        expect(
            envEndIndex,
            "Can't find '}' after 'ENV: {' in output:\n" + std
        ).is.not.equals(-1)

        const envString = std.substring(
            envStartIndex + 5,
            envEndIndex + 1,
        )
        let env
        try {
            env = JSON.parse(envString)
        } catch (err: Error | any) {
            err.message = "Can't parse env strean: '\n" + envString + "\n'\n\n" + err.message
            throw err
        }
        expect(
            uniqueStringify({
                ...env,
                CERT_PATH: "?" + env.CERT_PATH.substring(env.CERT_PATH.lastIndexOf("cprox"))
            }),
            "Actual env was: " + JSON.stringify(env, null, 2) + "\n" + out
        ).is.equals(uniqueStringify({
            "PRODUCTION": false,
            "VERBOSE": true,
            "DRYRUN": true,
            "TRUST_ALL_CERTS": true,
            "DNS_SERVER_ADDRESSES": [
                "127.0.0.11",
                "1.0.0.1",
                "8.8.4.4",
                "1.1.1.1",
                "8.8.8.8"
            ],
            "HTTP_PORT": 80,
            "HTTPS_PORT": 443,
            "BIND_ADDRESS": "0.0.0.0",
            "CERT_PATH": "?cprox/.store/certs",
            "CERT_NAME": "cert.pem",
            "KEY_NAME": "privkey.pem",
            "CA_NAME": "chain.pem",
            "DISABLE_SELF_SINGED": false,
            "SELF_SINGED_COMMON_DOMAIN_NAME": "example.com",
            "SELF_SINGED_COUNTRY_CODE": "INT",
            "SELF_SINGED_STATE_NAME": "International",
            "SELF_SINGED_LOCALITY_NAME": "International",
            "SELF_SINGED_ORGANIZATION_NAME": "None",
            "SELF_SINGED_EMAIL_ADDRESS": "none@example.com",
            "SELF_SINGED_NETSCAPE_COMMENT": "Self-Singed SSL Certificate by the CProX Server Software",
            "MAX_HEADER_SIZE": 4096,
            "CONNECTION_TIMEOUT": 15000,
            "PROXY_CONNECTION_TIMEOUT": 120000,
            "PROXY_REACTION_TIMEOUT": 3000,
            "PROXY_VERIFY_CERTIFICATE": false,
            "PROXY_FOLLOW_REDIRECTS": false
        }))
        expect(result.code, out).is.equals(0)

    })

    it('Check process arguments in envrionment', async function () {
        this.timeout(defaultCliTimeout)

        const result = await asyncFork(
            __dirname + "/../../index",
            {
                args: [
                    "--verbose",
                    "--trust-all-certs",
                    "*=STATIC:/var/www/html"
                ],
                env: {
                    "DRYRUN": "true",
                }
            }
        )
        await result.spawnPromise
        expect(result.promise).is.not.undefined
        await result.promise
        await result.close()

        const err = result.getErrOutput(undefined, "")
        const std = result.getStdOutput(undefined, "")
        const out = "Output:\n" + result.getOutput()

        expect(err, out).is.equals("")
        expect(std, out).is.not.equals("")

        const envStartIndex = std.indexOf("ENV: {")
        expect(
            envStartIndex,
            "Can't find 'ENV: {' in output:\n" + std
        ).is.not.equals(-1)

        const envEndIndex = std.lastIndexOf("}")
        expect(
            envEndIndex,
            "Can't find '}' after 'ENV: {' in output:\n" + std
        ).is.not.equals(-1)

        const envString = std.substring(
            envStartIndex + 5,
            envEndIndex + 1
        )
        let env
        try {
            env = JSON.parse(envString)
        } catch (err: Error | any) {
            err.message = "Can't parse env strean: '\n" + envString + "\n'\n\n" + err.message
            throw err
        }
        expect(
            uniqueStringify({
                ...env,
                CERT_PATH: "?" + env.CERT_PATH.substring(env.CERT_PATH.lastIndexOf("cprox"))
            }),
            "Actual env was: " + JSON.stringify(env, null, 2)
        ).is.equals(uniqueStringify({
            "PRODUCTION": false,
            "VERBOSE": true,
            "DRYRUN": true,
            "TRUST_ALL_CERTS": true,
            "DNS_SERVER_ADDRESSES": [
                "127.0.0.11",
                "1.0.0.1",
                "8.8.4.4",
                "1.1.1.1",
                "8.8.8.8"
            ],
            "HTTP_PORT": 80,
            "HTTPS_PORT": 443,
            "BIND_ADDRESS": "0.0.0.0",
            "CERT_PATH": "?cprox/.store/certs",
            "CERT_NAME": "cert.pem",
            "KEY_NAME": "privkey.pem",
            "CA_NAME": "chain.pem",
            "DISABLE_SELF_SINGED": false,
            "SELF_SINGED_COMMON_DOMAIN_NAME": "example.com",
            "SELF_SINGED_COUNTRY_CODE": "INT",
            "SELF_SINGED_STATE_NAME": "International",
            "SELF_SINGED_LOCALITY_NAME": "International",
            "SELF_SINGED_ORGANIZATION_NAME": "None",
            "SELF_SINGED_EMAIL_ADDRESS": "none@example.com",
            "SELF_SINGED_NETSCAPE_COMMENT": "Self-Singed SSL Certificate by the CProX Server Software",
            "MAX_HEADER_SIZE": 4096,
            "CONNECTION_TIMEOUT": 15000,
            "PROXY_CONNECTION_TIMEOUT": 120000,
            "PROXY_REACTION_TIMEOUT": 3000,
            "PROXY_VERIFY_CERTIFICATE": false,
            "PROXY_FOLLOW_REDIRECTS": false
        }))
        expect(result.code).is.equals(0)
    })
})
