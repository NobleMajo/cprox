import 'mocha'
import { expect } from 'chai'
import { parseRequestUrl } from "../reqdata"
import { uniqueStringify } from "majotools/dist/json"

describe('parseRequestUrl()', () => {
    it('Single request data', async () => {
        const data = parseRequestUrl("test.com", "/home/data")

        expect(data.host).is.equals("test.com")
        expect(data.path).is.equals("/home/data")
        expect(data.hostParts.join(", ")).is.equals(
            'com, test'
        )
        expect(data.pathParts.join(", ")).is.equals(
            'home, data'
        )
    })

    it('No host request data', async () => {
        const data = parseRequestUrl("", "/home/data")

        expect(data.host).is.equals("")
        expect(data.path).is.equals("/home/data")
        expect(data.hostParts.join(", ")).is.equals(
            ''
        )
        expect(data.pathParts.join(", ")).is.equals(
            'home, data'
        )
    })

    it('No path request data', async () => {
        const data = parseRequestUrl("wow.de", "")

        expect(data.host).is.equals("wow.de")
        expect(data.path).is.equals("")
        expect(data.hostParts.join(", ")).is.equals('de, wow')
        expect(uniqueStringify(data.pathParts)).is.equals('[]')
    })

    it('Large host request data', async () => {
        const data = parseRequestUrl(
            "test.test.majo.sysdev.test.test.test.com.test.net",
            "/home/data"
        )

        expect(data.host).is.equals(
            "test.test.majo.sysdev.test.test.test.com.test.net"
        )
        expect(data.path).is.equals("/home/data")
        expect(data.hostParts.join(", ")).is.equals(
            'net, test, com, test, test, test, sysdev, majo, test, test'
        )
        expect(data.pathParts.join(", ")).is.equals(
            'home, data'
        )
    })

    it('Large path request data', async () => {
        const data = parseRequestUrl(
            "example.com",
            "/home/data/data/sysdev/majo/var/var/var"
        )

        expect(data.host).is.equals("example.com")
        expect(data.path).is.equals(
            "/home/data/data/sysdev/majo/var/var/var"
        )
        expect(data.hostParts.join(", ")).is.equals(
            'com, example'
        )
        expect(data.pathParts.join(", ")).is.equals(
            'home, data, data, sysdev, majo, var, var, var'
        )
    })
})