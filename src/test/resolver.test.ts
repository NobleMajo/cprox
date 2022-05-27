import 'mocha';
import * as rule from "../rule";
import * as resolver from "../resolver";
import { expect } from 'chai';
import { findResolver } from '../resolver';
import { parseRequestUrl } from '../reqdata';
import {
    clearEnvironment,
    setEnvironment,
    exampleRules,
} from './assets';
import { uniqueStringify } from '../json';

describe('loadRawRules()', () => {
    it('Single environment rule', async () => {
        clearEnvironment("RULE_")
        setEnvironment(
            "RULE_",
            [
                exampleRules[0]
            ]
        )

        const rawRules = rule.loadRawRules()
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

        const rawRules = rule.loadRawRules()
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

        const rawRules = rule.loadRawRules()
        const rules = rule.parseRules(rawRules)
        const resolver2 = resolver.createResolvers(rules)


        expect(uniqueStringify(findResolver(
            parseRequestUrl("test.com", "/"),
            resolver2
        )?.rule)).is.equals(uniqueStringify(
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
            }
        ))
    })

    it('Multiple environment rule', async () => {
        clearEnvironment("RULE_")
        setEnvironment(
            "RULE_",
            exampleRules
        )

        const rawRules = rule.loadRawRules()
        const rules = rule.parseRules(rawRules)
        const sortedRules = rule.sortRules(rules)
        const resolver2 = resolver.createResolvers(sortedRules)

        expect(sortedRules.length).is.equals(rules.length)
        expect(uniqueStringify(
            sortedRules
        )).is.not.equals(uniqueStringify(
            rules
        ))

        expect(uniqueStringify(
            sortedRules.map((d) => d.host + d.path)
        )).is.equals(uniqueStringify([
            "sysdev.test.com/",
            "majo.test.com/",
            "*.redirect.com/",
            "*.example.com/",
            "*.test.com/",
            "example.com/",
            "test.com/",
            "*/"
        ]))

        expect(uniqueStringify(findResolver(
            parseRequestUrl("test.com", "/"),
            resolver2
        )?.rule)).is.equals(uniqueStringify(
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
            }
        ))

        expect(uniqueStringify(findResolver(
            parseRequestUrl("hello.net", "/test/wow"),
            resolver2
        )?.rule)).is.equals(uniqueStringify(
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
                    [
                        true,
                        "nginx_test",
                        8080
                    ]
                ],
                "type": "PROXY"
            }
        ))

        expect(uniqueStringify(findResolver(
            parseRequestUrl("somedomain.de", "/"),
            resolver2
        )?.rule)).is.equals(uniqueStringify(
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
                    [true, "nginx_test", 8080]
                ],
                "type": "PROXY"
            }
        ))

        expect(uniqueStringify(findResolver(
            parseRequestUrl("some.redirect.com", "/test"),
            resolver2
        )?.rule)).is.equals(uniqueStringify(
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
                    [
                        "https",
                        "test.test.com",
                        443,
                        "/"
                    ]
                ],
                "type": "REDIRECT"
            }
        ))
    })


})

