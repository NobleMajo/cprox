import chai from "chai";
import 'mocha';
import * as rule from "../rule";
import * as resolver from "../resolver";
import { exampleRules } from './rules.test';
import { expect } from 'chai';
import { findResolver } from '../resolver';
import { parseRequestUrl } from '../reqdata';

function clearEnvironment(prefix: string): void {
    for (let index = 1; true; index++) {
        const value = process.env[prefix + index]
        if (!value) {
            break;
        }
        delete process.env[prefix + index]
    }
}

function setEnvironment(prefix: string, values: string[]): void {
    values.forEach((value, i) => {
        process.env[prefix + (i + 1)] = value
    })
}

describe('loadRawRules()', () => {
    it('Single environment rule', async () => {
        clearEnvironment("RULE_")
        setEnvironment(
            "RULE_",
            [
                exampleRules[0]
            ]
        )

        const rawRules = rule.loadRawRules([], "RULE_", false, false)
        const rules = rule.parseRules(rawRules)
        const resolver2 = resolver.createResolvers(rules)

        expect(resolver2.length).is.equals(1)
    })

    it('Mulitple environment rule', async () => {
        clearEnvironment("RULE_")
        setEnvironment(
            "RULE_",
            exampleRules
        )

        const rawRules = rule.loadRawRules([], "RULE_", false, false)
        const rules = rule.parseRules(rawRules)
        const resolver2 = resolver.createResolvers(rules)

        expect(resolver2.length).is.equals(8)
    })
})

describe('findResolver()', () => {
    it('Single environment rule', async () => {
        clearEnvironment("RULE_")
        setEnvironment(
            "RULE_",
            [
                exampleRules[0]
            ]
        )

        const rawRules = rule.loadRawRules([], "RULE_", false, false)
        const rules = rule.parseRules(rawRules)
        const resolver2 = resolver.createResolvers(rules)


        expect(JSON.stringify(findResolver(
            parseRequestUrl("test.com", "/"),
            resolver2
        )?.rule, null, 4)).is.equals(JSON.stringify(
            {
                "host": "test.com",
                "path": "/",
                "hostParts": ["com", "test"],
                "pathParts": [""],
                "hasWildCard": false,
                "raw": "test.com=STATIC:/var/www/test",
                "hostVars": [], "pathVars": [],
                "target": "/var/www/test",
                "type": "STATIC"
            },
            null, 4
        ))
    })

    it('Multiple environment rule', async () => {
        clearEnvironment("RULE_")
        setEnvironment(
            "RULE_",
            exampleRules
        )

        const rawRules = rule.loadRawRules([], "RULE_", false, false)
        const rules = rule.parseRules(rawRules)
        const sortedRules = rule.sortRules(rules)
        const resolver2 = resolver.createResolvers(sortedRules)

        expect(sortedRules.length).is.equals(rules.length)
        expect(JSON.stringify(
            sortedRules
        )).is.not.equals(JSON.stringify(
            rules
        ))

        expect(JSON.stringify(
            sortedRules.map((d) => d.host + d.path),
            null, 4
        )).is.equals(JSON.stringify([
            "sysdev.test.com/",
            "majo.test.com/",
            "*.redirect.com/",
            "*.example.com/",
            "*.test.com/",
            "example.com/",
            "test.com/",
            "*/"
        ], null, 4))

        expect(JSON.stringify(findResolver(
            parseRequestUrl("test.com", "/"),
            resolver2
        )?.rule, null, 4)).is.equals(JSON.stringify(
            {
                "host": "test.com",
                "path": "/",
                "hostParts": ["com", "test"],
                "pathParts": [""],
                "hasWildCard": false,
                "raw": "test.com=STATIC:/var/www/test",
                "hostVars": [], "pathVars": [],
                "target": "/var/www/test",
                "type": "STATIC"
            },
            null, 4
        ))

        expect(JSON.stringify(findResolver(
            parseRequestUrl("hello.net", "/test/wow"),
            resolver2
        )?.rule, null, 4)).is.equals(JSON.stringify(
            {
                "host": "*",
                "path": "/",
                "hostParts": [
                    "*"
                ],
                "pathParts": [
                    ""
                ],
                "hasWildCard": true,
                "raw": "*=PROXY:https://nginx_test:8080",
                "hostVars": [],
                "pathVars": [],
                "target": [
                    true,
                    "nginx_test",
                    8080
                ],
                "type": "PROXY"
            },
            null, 4
        ))

        expect(JSON.stringify(findResolver(
            parseRequestUrl("somedomain.de", "/"),
            resolver2
        )?.rule, null, 4)).is.equals(JSON.stringify(
            {
                "host": "*",
                "path": "/",
                "hostParts": [
                    "*"
                ],
                "pathParts": [
                    ""
                ],
                "hasWildCard": true,
                "raw": "*=PROXY:https://nginx_test:8080",
                "hostVars": [],
                "pathVars": [],
                "target": [
                    true,
                    "nginx_test",
                    8080
                ],
                "type": "PROXY"
            },
            null, 4
        ))

        expect(JSON.stringify(findResolver(
            parseRequestUrl("some.redirect.com", "/test"),
            resolver2
        )?.rule, null, 4)).is.equals(JSON.stringify(
            {
                "host": "*.redirect.com",
                "path": "/",
                "hostParts": [
                    "com",
                    "redirect",
                    "*"
                ],
                "pathParts": [
                    ""
                ],
                "hasWildCard": true,
                "raw": "*.redirect.com=REDIRECT:https://test.test.com",
                "hostVars": [],
                "pathVars": [],
                "target": [
                    "https",
                    "test.test.com",
                    443,
                    "/"
                ],
                "type": "REDIRECT"
            },
            null, 4
        ))
    })


})

