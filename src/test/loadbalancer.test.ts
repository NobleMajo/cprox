import { expect } from 'chai'
import { uniqueStringify } from "majotools/dist/json"
import 'mocha'
import { parseRequestUrl } from '../reqdata'
import * as resolver from "../resolver"
import { findResolver } from '../resolver'
import * as rule from "../rule"

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
            "targetValue": "http://127.0.0.1:8080,http://127.0.0.1:8081",
            "raw": "*=PROXY:http://127.0.0.1:8080,http://127.0.0.1:8081",
            "target": [
                {
                    "secure": false,
                    "host": "127.0.0.1",
                    "port": 8080,
                    "allowProxyRequestHeader": false
                },
                {
                    "secure": false,
                    "host": "127.0.0.1",
                    "port": 8081,
                    "allowProxyRequestHeader": false
                }
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
                    parseRequestUrl("test.com/test/123"),
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
            "originUrl": "*/",
            "originHost": "*",
            "originPath": "/",
            "hostParts": ["*"],
            "pathParts": [],
            "hasWildCard": true,
            "hostVars": [], "pathVars": [],
            "targetType": "REDIRECT",
            "targetValue": "https://start.duckduckgo.com,https://coreunit.net,https://www.npmjs.com/package/http-proxy,https://certbot-dns-cloudflare.readthedocs.io/en/stable/,https://crontab.guru/,https://duckduckgo.com/?q=port+range&t=vivaldi&ia=web,http://random.cat",
            "raw": rawRule,
            "target": [
                {
                    "protocol": "https",
                    "host": "start.duckduckgo.com",
                    "port": 443,
                    "path": "/"
                },
                {
                    "protocol": "https",
                    "host": "coreunit.net",
                    "port": 443,
                    "path": "/"
                },
                {
                    "protocol": "https",
                    "host": "www.npmjs.com",
                    "port": 443,
                    "path": "/package/http-proxy"
                },
                {
                    "protocol": "https",
                    "host": "certbot-dns-cloudflare.readthedocs.io",
                    "port": 443,
                    "path": "/en/stable/"
                },
                {
                    "protocol": "https",
                    "host": "crontab.guru",
                    "port": 443,
                    "path": "/"
                },
                {
                    "protocol": "https",
                    "host": "duckduckgo.com",
                    "port": 443,
                    "path": "/?q=port+range&t=vivaldi&ia=web"
                },
                {
                    "protocol": "http",
                    "host": "random.cat",
                    "port": 80,
                    "path": "/"
                }
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
                    parseRequestUrl("test.com/test/123"),
                    resolver2
                )?.rule
            )
        ).is.equals(uniqueStringify(
            expectedRule
        ))
    })
})

