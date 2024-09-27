import { expect } from 'chai'
import { uniqueStringify } from "majotools/dist/json"
import 'mocha'
import { parseRequestHostPath, parseRequestUrl } from "../reqdata"

describe('parseRequestHostPath()', () => {
    it('Single request data', async () => {
        const data = parseRequestHostPath("test.com", "/home/data")

        expect(data.originHost).is.equals("test.com")
        expect(data.originPath).is.equals("/home/data")
        expect(data.hostParts.join(", ")).is.equals(
            'com, test'
        )
        expect(data.pathParts.join(", ")).is.equals(
            'home, data'
        )
    })

    it('No host request data', async () => {
        const data = parseRequestHostPath("", "/home/data")

        expect(data.originHost).is.equals("")
        expect(data.originPath).is.equals("/home/data")
        expect(data.hostParts.join(", ")).is.equals(
            ''
        )
        expect(data.pathParts.join(", ")).is.equals(
            'home, data'
        )
    })

    it('No path request data', async () => {
        const data = parseRequestHostPath("wow.de", "")

        expect(data.originHost).is.equals("wow.de")
        expect(data.originPath).is.equals("")
        expect(data.hostParts.join(", ")).is.equals('de, wow')
        expect(uniqueStringify(data.pathParts)).is.equals('[]')
    })

    it('Large host request data', async () => {
        const data = parseRequestHostPath(
            "test.test.majo.sysdev.test.test.test.com.test.net",
            "/home/data"
        )

        expect(data.originHost).is.equals(
            "test.test.majo.sysdev.test.test.test.com.test.net"
        )
        expect(data.originPath).is.equals("/home/data")
        expect(data.hostParts.join(", ")).is.equals(
            'net, test, com, test, test, test, sysdev, majo, test, test'
        )
        expect(data.pathParts.join(", ")).is.equals(
            'home, data'
        )
    })

    it('Large path request data', async () => {
        const data = parseRequestHostPath(
            "example.com",
            "/home/data/data/sysdev/majo/var/var/var"
        )

        expect(data.originHost).is.equals("example.com")
        expect(data.originPath).is.equals(
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

describe('parseRequestUrl()', () => {
    it('Single request data', async () => {
        const data = parseRequestUrl(
            "test.com" +
            "/home/data"
        )

        expect(data.originHost).is.equals("test.com")
        expect(data.originPath).is.equals("/home/data")
        expect(data.hostParts.join(", ")).is.equals(
            'com, test'
        )
        expect(data.pathParts.join(", ")).is.equals(
            'home, data'
        )
    })

    it('No host request data', async () => {
        const data = parseRequestUrl(
            "" +
            "/home/data"
        )

        expect(data.originHost).is.equals("")
        expect(data.originPath).is.equals("/home/data")
        expect(data.hostParts.join(", ")).is.equals(
            ''
        )
        expect(data.pathParts.join(", ")).is.equals(
            'home, data'
        )
    })

    it('No path request data', async () => {
        const data = parseRequestUrl(
            "wow-none.de" +
            ""
        )

        expect(
            data.originHost,
            "Data: " + JSON.stringify(data, null, 4)
        ).is.equals("wow-none.de")
        expect(
            data.originPath,
            "Data: " + JSON.stringify(data, null, 4)
        ).is.equals("/")
        expect(
            data.hostParts.join(", "),
            "Data: " + JSON.stringify(data, null, 4)
        ).is.equals('de, wow-none')
        expect(
            uniqueStringify(data.pathParts),
            "Data: " + JSON.stringify(data, null, 4)
        ).is.equals('[]')
    })

    it('Root path request data', async () => {
        const data = parseRequestUrl(
            "wow-root.com" +
            "/"
        )

        expect(
            data.originHost,
            "Data: " + JSON.stringify(data, null, 4)
        ).is.equals("wow-root.com")
        expect(
            data.originPath,
            "Data: " + JSON.stringify(data, null, 4)
        ).is.equals("/")
        expect(
            data.hostParts.join(", "),
            "Data: " + JSON.stringify(data, null, 4)
        ).is.equals('com, wow-root')
        expect(
            uniqueStringify(data.pathParts),
            "Data: " + JSON.stringify(data, null, 4)
        ).is.equals('[]')
    })

    it('Large host request data', async () => {
        const data = parseRequestUrl(
            "test.test.majo.sysdev.test.test.test.com.test.net" +
            "/home/data"
        )

        expect(data.originHost).is.equals(
            "test.test.majo.sysdev.test.test.test.com.test.net"
        )
        expect(data.originPath).is.equals("/home/data")
        expect(data.hostParts.join(", ")).is.equals(
            'net, test, com, test, test, test, sysdev, majo, test, test'
        )
        expect(data.pathParts.join(", ")).is.equals(
            'home, data'
        )
    })

    it('Large path request data', async () => {
        const data = parseRequestUrl(
            "example.com" +
            "/home/data/data/sysdev/majo/var/var/var"
        )

        expect(data.originHost).is.equals("example.com")
        expect(data.originPath).is.equals(
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