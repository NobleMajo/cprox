import 'mocha';
import { expect } from 'chai'
import {
    defaultE2ETimeout, defaultCliTimeout,
    asyncFork,
} from '../e2e'
import { uniqueStringify } from '../../json';

describe('Live env', function () {
    this.timeout(defaultE2ETimeout)

    it('Check verbose envtionment variable', async function () {
        this.timeout(defaultCliTimeout)

        const result = await asyncFork(
            __dirname + "/../../index",
            {
                args: ["*=STATIC:/var/www/html"],
                env: {
                    "VERBOSE": "true",
                }
            }
        )
        await result.spawnPromise
        expect(result.promise).is.not.undefined
        await result.promise
        await result.close()

        expect(result.code).is.equals(null)
        expect(result.getErrOutput()).is.equals("")
        const out = result.getStdOutput(undefined, "")
        expect(out.length).is.not.equals(0)

        const envStartIndex = out.indexOf("ENV: {")
        expect(
            envStartIndex,
            "Can't find 'ENV: {' in output:\n" + out
        ).is.not.equals(-1)

        const envEndIndex = out.lastIndexOf("}")
        expect(
            envEndIndex,
            "Can't find '}' in output:\n" + out
        ).is.not.equals(-1)

        const envString = out.substring(
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
            uniqueStringify(env),
            "Actual env was: " + JSON.stringify(env, null, 2)
        ).is.equals(uniqueStringify({
            "PRODUCTION": false,
            "VERBOSE": true,
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
            "CERT_PATH": "/home/codec/ws/main/npm/cprox/certs",
            "CERT_NAME": "cert.pem",
            "KEY_NAME": "privkey.pem",
            "CA_NAME": "chain.pem",
            "DISABLE_SELF_SINGED": false,
            "SELF_SINGED_DOMAIN": "example.com",
            "MAX_HEADER_SIZE": 4096,
            "CONNECTION_TIMEOUT": 15000,
            "PROXY_CONNECTION_TIMEOUT": 120000,
            "PROXY_REACTION_TIMEOUT": 3000,
            "PROXY_VERIFY_CERTIFICATE": false,
            "PROXY_FOLLOW_REDIRECTS": false
        }))
    })

    it('Check extra envtionment variables', async function () {
        this.timeout(defaultCliTimeout)

        const result = await asyncFork(
            __dirname + "/../../index",
            {
                args: ["*=STATIC:/var/www/html"],
                env: {
                    "VERBOSE": "true",
                    "TRUST_ALL_CERTS": "false",
                    "SELF_SINGED_DOMAIN": "test.com",
                }
            }
        )
        await result.spawnPromise
        expect(result.promise).is.not.undefined
        await result.promise
        await result.close()

        expect(result.code).is.equals(null)
        expect(result.getErrOutput()).is.equals("")
        const out = result.getStdOutput(undefined, "")
        expect(out.length).is.not.equals(0)

        const envStartIndex = out.indexOf("ENV: {")
        expect(
            envStartIndex,
            "Can't find 'ENV: {' in output:\n" + out
        ).is.not.equals(-1)

        const envEndIndex = out.lastIndexOf("}")
        expect(
            envEndIndex,
            "Can't find '}' in output:\n" + out
        ).is.not.equals(-1)

        const envString = out.substring(
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
            uniqueStringify(env),
            "Actual env was: " + JSON.stringify(env, null, 2)
        ).is.equals(uniqueStringify({
            "PRODUCTION": false,
            "VERBOSE": true,
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
            "CERT_PATH": "/home/codec/ws/main/npm/cprox/certs",
            "CERT_NAME": "cert.pem",
            "KEY_NAME": "privkey.pem",
            "CA_NAME": "chain.pem",
            "DISABLE_SELF_SINGED": false,
            "SELF_SINGED_DOMAIN": "test.com",
            "MAX_HEADER_SIZE": 4096,
            "CONNECTION_TIMEOUT": 15000,
            "PROXY_CONNECTION_TIMEOUT": 120000,
            "PROXY_REACTION_TIMEOUT": 3000,
            "PROXY_VERIFY_CERTIFICATE": false,
            "PROXY_FOLLOW_REDIRECTS": false
        }))

    })

    it('Check process arguments in envrionment', async function () {
        this.timeout(defaultCliTimeout)

        const result = await asyncFork(
            __dirname + "/../../index",
            {
                args: [
                    "--trust-all-certs",
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

        expect(result.code).is.equals(0)
        expect(result.getErrOutput()).is.equals("")
        const out = result.getStdOutput(undefined, "")
        expect(out.length).is.not.equals(0)

        const envStartIndex = out.indexOf("ENV: {")
        expect(
            envStartIndex,
            "Can't find 'ENV: {' in output:\n" + out
        ).is.not.equals(-1)

        const envEndIndex = out.lastIndexOf("}")
        expect(
            envEndIndex,
            "Can't find '}' in output:\n" + out
        ).is.not.equals(-1)

        const envString = out.substring(
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
            uniqueStringify(env),
            "Actual env was: " + JSON.stringify(env, null, 2)
        ).is.equals(uniqueStringify({
            "PRODUCTION": false,
            "VERBOSE": true,
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
            "CERT_PATH": "/home/codec/ws/main/npm/cprox/certs",
            "CERT_NAME": "cert.pem",
            "KEY_NAME": "privkey.pem",
            "CA_NAME": "chain.pem",
            "DISABLE_SELF_SINGED": false,
            "SELF_SINGED_DOMAIN": "example.com",
            "MAX_HEADER_SIZE": 4096,
            "CONNECTION_TIMEOUT": 15000,
            "PROXY_CONNECTION_TIMEOUT": 120000,
            "PROXY_REACTION_TIMEOUT": 3000,
            "PROXY_VERIFY_CERTIFICATE": false,
            "PROXY_FOLLOW_REDIRECTS": false
        }))
    })
})
