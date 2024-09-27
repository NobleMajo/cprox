import { expect } from 'chai';
import { uniqueStringify } from "majotools/dist/json";
import 'mocha';
import { parseRequestUrl } from '../reqdata';
import * as resolver from "../resolver";
import { findResolver } from '../resolver';
import * as rule from "../rule";
import {
    clearEnvironment,
    exampleRules,
    setEnvironment,
} from './example';

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
            parseRequestUrl("test.com/"),
            resolver2
        )?.rule)).is.equals(uniqueStringify(
            {
                "originUrl": "test.com/",
                "originHost": "test.com",
                "originPath": "/",
                "hostParts": [
                    "com",
                    "test"
                ],
                "pathParts": [],
                "hasWildCard": false,
                "hostVars": [],
                "pathVars": [],
                "targetType": "STATIC",
                "targetValue": "/var/www/test",
                "raw": "test.com=STATIC:/var/www/test",
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
            sortedRules.map((d) => d.originUrl)
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
            parseRequestUrl("test.com/"),
            resolver2
        )?.rule)).is.equals(uniqueStringify(
            {
                "originUrl": "test.com/",
                "originHost": "test.com",
                "originPath": "/",
                "hostParts": [
                    "com",
                    "test"
                ],
                "pathParts": [],
                "hasWildCard": false,
                "hostVars": [],
                "pathVars": [],
                "targetType": "STATIC",
                "targetValue": "/var/www/test",
                "raw": "test.com=STATIC:/var/www/test",
                "target": "/var/www/test",
                "type": "STATIC"
            }
        ))

        expect(uniqueStringify(findResolver(
            parseRequestUrl("hello.net/test/wow"),
            resolver2
        )?.rule)).is.equals(uniqueStringify(
            {
                "originUrl": "*/",
                "originHost": "*",
                "originPath": "/",
                "hostParts": [
                    "*"
                ],
                "pathParts": [],
                "hasWildCard": true,
                "hostVars": [],
                "pathVars": [],
                "targetType": "PROXY",
                "targetValue": "https://nginx_test:8080",
                "raw": "*=PROXY:https://nginx_test:8080",
                "target": [
                    {
                        "secure": true,
                        "host": "nginx_test",
                        "port": 8080,
                        "allowProxyRequestHeader": false
                    }
                ],
                "type": "PROXY"
            }
        ))

        expect(uniqueStringify(findResolver(
            parseRequestUrl("somedomain.de/"),
            resolver2
        )?.rule)).is.equals(uniqueStringify(
            {
                "originUrl": "*/",
                "originHost": "*",
                "originPath": "/",
                "hostParts": [
                    "*"
                ],
                "pathParts": [],
                "hasWildCard": true,
                "hostVars": [],
                "pathVars": [],
                "targetType": "PROXY",
                "targetValue": "https://nginx_test:8080",
                "raw": "*=PROXY:https://nginx_test:8080",
                "target": [
                    {
                        "secure": true,
                        "host": "nginx_test",
                        "port": 8080,
                        "allowProxyRequestHeader": false
                    }
                ],
                "type": "PROXY"
            }
        ))

        expect(uniqueStringify(findResolver(
            parseRequestUrl("some.redirect.com/test"),
            resolver2
        )?.rule)).is.equals(uniqueStringify(
            {
                "originUrl": "*.redirect.com/",
                "originHost": "*.redirect.com",
                "originPath": "/",
                "hostParts": [
                    "com",
                    "redirect",
                    "*"
                ],
                "pathParts": [],
                "hasWildCard": true,
                "hostVars": [],
                "pathVars": [],
                "targetType": "REDIRECT",
                "targetValue": "https://test.test.com",
                "raw": "*.redirect.com=REDIRECT:https://test.test.com",
                "target": [
                    {
                        "protocol": "https",
                        "host": "test.test.com",
                        "port": 443,
                        "path": "/"
                    }
                ],
                "type": "REDIRECT"
            }
        ))
    })


})

