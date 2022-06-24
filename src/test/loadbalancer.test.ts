import 'mocha'
import * as rule from "../rule"
import * as resolver from "../resolver"
import { expect } from 'chai'
import { findResolver } from '../resolver'
import { parseRequestUrl } from '../reqdata'
import { uniqueStringify } from "majotools/dist/json"

describe('Load balancer', () => {
    it('Check local proxy load balancer with 2 targets', async () => {
        const rawRule = "*=PROXY:http://127.0.0.1:8080,http://127.0.0.1:8081"
        const rawRules = rule.loadRawRules([
            rawRule,
        ])
        const rules = rule.parseRules(rawRules)
        const sortedRules = rule.sortRules(rules)
        const resolver2 = resolver.createResolvers(sortedRules)

        expect(sortedRules.length).is.equals(rules.length)
        expect(uniqueStringify(
            sortedRules
        )).is.equals(uniqueStringify(
            rules
        ))

        const expectedRule = {
            "host": "*",
            "path": "/",
            "hostParts": ["*"],
            "pathParts": [""],
            "hasWildCard": true,
            "raw": rawRule,
            "hostVars": [], "pathVars": [],
            "target": [
                [false, "127.0.0.1", 8080],
                [false, "127.0.0.1", 8081]
            ],
            "type": "PROXY"
        }

        expect(
            uniqueStringify(sortedRules)
        ).is.equals(uniqueStringify(
            [expectedRule]
        ))

        expect(
            uniqueStringify(
                findResolver(
                    parseRequestUrl("test.com", "/test/123"),
                    resolver2
                )?.rule
            )
        ).is.equals(uniqueStringify(
            expectedRule
        ))
    })

    it('Check redirect load balancer rules with 7 targets', async () => {
        const rawRule = "*=REDIRECT:" + [
            "https://start.duckduckgo.com",
            "https://coreunit.net",
            "https://www.npmjs.com/package/http-proxy",
            "https://certbot-dns-cloudflare.readthedocs.io/en/stable/",
            "https://crontab.guru/",
            "https://duckduckgo.com/?q=port+range&t=vivaldi&ia=web",
            "http://random.cat",
        ].join(",")
        const rawRules = rule.loadRawRules([
            rawRule,
        ])
        const rules = rule.parseRules(rawRules)
        const sortedRules = rule.sortRules(rules)
        const resolver2 = resolver.createResolvers(sortedRules)

        expect(sortedRules.length).is.equals(rules.length)
        expect(uniqueStringify(
            sortedRules
        )).is.equals(uniqueStringify(
            rules
        ))

        const expectedRule = {
            "host": "*",
            "path": "/",
            "hostParts": ["*"],
            "pathParts": [""],
            "hasWildCard": true,
            "raw": rawRule,
            "hostVars": [], "pathVars": [],
            "target": [
                ['https', 'start.duckduckgo.com', 443, '/'],
                ['https', 'coreunit.net', 443, '/'],
                ['https', 'www.npmjs.com', 443, '/package/http-proxy'],
                [
                    'https',
                    'certbot-dns-cloudflare.readthedocs.io',
                    443,
                    '/en/stable/'
                ],
                ['https', 'crontab.guru', 443, '/'],
                ['https', 'duckduckgo.com', 443, '/?q=port+range&t=vivaldi&ia=web'],
                ['http', 'random.cat', 80, '/']
            ],
            "type": "REDIRECT"
        }

        expect(
            uniqueStringify(sortedRules)
        ).is.equals(uniqueStringify(
            [expectedRule]
        ))

        expect(
            uniqueStringify(
                findResolver(
                    parseRequestUrl("test.com", "/test/123"),
                    resolver2
                )?.rule
            )
        ).is.equals(uniqueStringify(
            expectedRule
        ))
    })
})

