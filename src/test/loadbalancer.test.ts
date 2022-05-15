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
    uniqueStringify
} from './assets';

describe('Load balancer', () => {
    it('Check local proxy load balancer rules with 2 targets', async () => {
        const rawRules = rule.loadRawRules([
            "*=PROXY:http://127.0.0.1:8080,http://127.0.0.1:8081",
        ])
        const rules = rule.parseRules(rawRules)
        const sortedRules = rule.sortRules(rules)

        expect(sortedRules.length).is.equals(rules.length)
        expect(uniqueStringify(
            sortedRules
        )).is.equals(uniqueStringify(
            rules
        ))

        expect(
            uniqueStringify(sortedRules)
        ).is.equals(uniqueStringify(
            [
                {
                    "host": "*",
                    "path": "/",
                    "hostParts": ["*"],
                    "pathParts": [""],
                    "hasWildCard": true,
                    "raw": "*=PROXY:http://127.0.0.1:8080,http://127.0.0.1:8081",
                    "hostVars": [], "pathVars": [],
                    "target": [
                        [false, "127.0.0.1", 8080],
                        [false, "127.0.0.1", 8081]
                    ],
                    "type": "PROXY"
                }
            ]
        ))
    })

    it('Check local proxy load balancer with 2 targets', async () => {
        const rawRules = rule.loadRawRules([
            "*=PROXY:http://127.0.0.1:8080,http://127.0.0.1:8081",
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

        expect(
            uniqueStringify(
                findResolver(
                    parseRequestUrl("test.com", "/test/123"),
                    resolver2
                )?.rule
            )
        ).is.equals(uniqueStringify(
            {
                "host": "*",
                "path": "/",
                "hostParts": ["*"],
                "pathParts": [""],
                "hasWildCard": true,
                "raw": "*=PROXY:http://127.0.0.1:8080,http://127.0.0.1:8081",
                "hostVars": [], "pathVars": [],
                "target": [
                    [false, "127.0.0.1", 8080],
                    [false, "127.0.0.1", 8081]
                ],
                "type": "PROXY"
            }
        ))
    })
})

