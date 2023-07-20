import { expect } from 'chai'
import { uniqueStringify } from "majotools/dist/json"
import 'mocha'
import * as rule from "../rule"
import { RawRules } from "../rule"
import {
    clearEnvironment,
    exampleRules,
    setEnvironment,
} from './example'

describe('loadRawRules()', () => {
    it('Single environment rule', async () => {
        clearEnvironment("RULE_")
        setEnvironment(
            "RULE_",
            [
                exampleRules[0],
            ]
        )

        const rules = rule.loadRawRules()
        const ruleKeys = Object.keys(rules)

        expect(Object.keys(rules).length).is.equals(1)
        ruleKeys[0] = 'test.com'
        rules[0] == 'STATIC:/var/www/test'
    })

    it('Multiple environment rule', async () => {
        clearEnvironment("RULE_")
        setEnvironment(
            "RULE_",
            exampleRules
        )

        const rules = rule.loadRawRules()
        const expectRules: any = {
            'test.com': 'STATIC:/var/www/test',
            'example.com': 'PROXY:example_nginx:18080',
            'majo.test.com': 'REDIRECT:github.com/majo418',
            'sysdev.test.com': 'REDIRECT:github.com/sysdev',
            '*': 'PROXY:https://nginx_test:8080',
            '*.example.com': 'STATIC:/var/www/html',
            '*.redirect.com': 'REDIRECT:https://test.test.com',
            '*.test.com': 'STATIC:/var/www/test'
        }

        const ruleString = uniqueStringify(rules)
        const expectRuleString = uniqueStringify(expectRules)
        expect(
            ruleString,
            "Result: " + ruleString
        ).is.equals(expectRuleString)
    })
})

describe('sortRules()', () => {
    it('Host rules', async () => {
        const rawRules: rule.RawRules = {
            "test.com": "STATIC:/vat/www/html",
            "*.example.com": "STATIC:/vat/www/html",
            "wow.com": "STATIC:/vat/www/html",
            "supertest.example.com": "STATIC:/vat/www/html",
            "*": "STATIC:/vat/www/html",
            "other.example.com": "STATIC:/vat/www/html",
            "*.net": "STATIC:/vat/www/html",
            "test.supertest.example.com": "STATIC:/vat/www/html",
            "*.supertest.example.com": "STATIC:/vat/www/html",
        }
        const rules = rule.parseRules(rawRules)
        const sortRules = rule.sortRules(rules)
        expect(uniqueStringify(
            sortRules.map((r) => r.originHost)
        )).is.equals(uniqueStringify(
            [
                "test.supertest.example.com",
                "*.supertest.example.com",
                "supertest.example.com",
                "other.example.com",
                "*.example.com",
                "test.com",
                "wow.com",
                "*.net",
                "*",
            ]
        ))
    })

    it('Path rules', async () => {
        const rawRules: RawRules = {
            "*/qwer//wow3": "STATIC:/vat/www/html",
            "*/test": "STATIC:/vat/www/html",
            "*/qwer/*/test/": "STATIC:/vat/www/html",
            "*/": "STATIC:/vat/www/html",
            "*": "STATIC:/vat/www/html",
            "*/qwer/wow3": "STATIC:/vat/www/html",
            "*/*/wow2": "STATIC:/vat/www/html",
            "*/qwer/wow2": "STATIC:/vat/www/html",
            "*/*/*/test": "STATIC:/vat/www/html",
            "*/qwer/*/test": "STATIC:/vat/www/html",
            "*/qwer/wow": "STATIC:/vat/www/html",
        }
        const rules = rule.parseRules(rawRules)
        const sortRules = rule.sortRules(rules)
        expect(uniqueStringify(
            sortRules.map((r) => r.originPath)
        )).is.equals(uniqueStringify(
            [
                "/qwer/*/test/",
                "/qwer/*/test",
                "/qwer//wow3",
                "/qwer/wow3",
                "/qwer/wow2",
                "/*/*/test",
                "/qwer/wow",
                "/*/wow2",
                "/test",
                "/",
                "/",
            ]
        ))
    })

    it('Mix rules', async () => {
        const rawRules: RawRules = {
            "test.com/": "STATIC:/vat/www/html",
            "test.com/*/*/test": "STATIC:/vat/www/html",
            "test.com/qwer/*/test": "STATIC:/vat/www/html",
            "test.com/qwer/wow": "STATIC:/vat/www/html",
            "example.com/": "STATIC:/vat/www/html",
            "example.com/*/*/test": "STATIC:/vat/www/html",
            "example.com/qwer/*/test": "STATIC:/vat/www/html",
            "example.com/qwer/wow": "STATIC:/vat/www/html",
            "coreunit.net/": "STATIC:/vat/www/html",
            "coreunit.net/*/*/test": "STATIC:/vat/www/html",
            "coreunit.net/qwer/*/test": "STATIC:/vat/www/html",
            "coreunit.net/qwer/wow": "STATIC:/vat/www/html",

        }
        const rules = rule.parseRules(rawRules)
        const sortRules = rule.sortRules(rules)
        expect(uniqueStringify(
            sortRules.map((r) => r.originUrl)
        )).is.equals(uniqueStringify(
            [
                "coreunit.net/qwer/*/test",
                "coreunit.net/*/*/test",
                "coreunit.net/qwer/wow",
                "coreunit.net/",
                "example.com/qwer/*/test",
                "example.com/*/*/test",
                "example.com/qwer/wow",
                "example.com/",
                "test.com/qwer/*/test",
                "test.com/*/*/test",
                "test.com/qwer/wow",
                "test.com/"
            ]
        ))
    })
})

describe('parseRules()', () => {
    it('Single environment rule', async () => {
        clearEnvironment("RULE_")
        setEnvironment(
            "RULE_",
            [
                exampleRules[0],
            ]
        )

        const rawRule = rule.loadRawRules()
        const rule2 = rule.parseRules(rawRule)

        const expectRule = [
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
        ]

        const ruleStirng = uniqueStringify(rule2)
        const expectRuleString = uniqueStringify(expectRule)
        expect(
            ruleStirng,
            "Result: " + ruleStirng
        ).is.equals(expectRuleString)
    })

    it('Multiple environment rule', async () => {
        clearEnvironment("RULE_")
        setEnvironment(
            "RULE_",
            exampleRules
        )

        const rawRules = rule.loadRawRules()
        const rules = rule.parseRules(rawRules)
        const expectRules = [
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
            },
            {
                "originUrl": "example.com/",
                "originHost": "example.com",
                "originPath": "/",
                "hostParts": [
                    "com",
                    "example"
                ],
                "pathParts": [],
                "hasWildCard": false,
                "hostVars": [],
                "pathVars": [],
                "targetType": "PROXY",
                "targetValue": "example_nginx:18080",
                "raw": "example.com=PROXY:example_nginx:18080",
            },
            {
                host: 'majo.test.com',
                path: '/',
                hostParts: ['com', 'test', 'majo'],
                pathParts: [],
                hasWildCard: false,
                raw: 'majo.test.com=REDIRECT:github.com/majo418',
                hostVars: [],
                pathVars: [],
                target: [
                    {
                        "protocol": "https",
                        "host": "github.com",
                        "port": 443,
                        "path": "/majo418"
                    }
                ],
                type: 'REDIRECT'
            },
            {
                host: 'sysdev.test.com',
                path: '/',
                hostParts: ['com', 'test', 'sysdev'],
                pathParts: [],
                hasWildCard: false,
                raw: 'sysdev.test.com=REDIRECT:github.com/sysdev',
                hostVars: [],
                pathVars: [],
                target: [
                    {
                        "protocol": "https",
                        "host": "github.com",
                        "port": 443,
                        "path": "/sysdev"
                    }
                ],
                type: 'REDIRECT'
            },
            {
                host: '*',
                path: '/',
                hostParts: ['*'],
                pathParts: [],
                hasWildCard: true,
                raw: '*=PROXY:https://nginx_test:8080',
                hostVars: [],
                pathVars: [],
                target: [
                    {
                        "secure": true,
                        "host": "nginx_test",
                        "port": 8080,
                        "allowProxyRequestHeader": false
                    }
                ],
                type: 'PROXY'
            },
            {
                host: '*.example.com',
                path: '/',
                hostParts: ['com', 'example', '*'],
                pathParts: [],
                hasWildCard: true,
                raw: '*.example.com=STATIC:/var/www/html',
                hostVars: [],
                pathVars: [],
                target: '/var/www/html',
                type: 'STATIC'
            },
            {
                host: '*.redirect.com',
                path: '/',
                hostParts: ['com', 'redirect', '*'],
                pathParts: [],
                hasWildCard: true,
                raw: '*.redirect.com=REDIRECT:https://test.test.com',
                hostVars: [],
                pathVars: [],
                target: [
                    {
                        "protocol": "https",
                        "host": "test.test.com",
                        "port": 443,
                        "path": "/"
                    }
                ],
                type: 'REDIRECT'
            },
            {
                host: '*.test.com',
                path: '/',
                hostParts: ['com', 'test', '*'],
                pathParts: [],
                hasWildCard: true,
                raw: '*.test.com=STATIC:/var/www/test',
                hostVars: [],
                pathVars: [],
                target: '/var/www/test',
                type: 'STATIC'
            }
        ]

        expect(
            rules.length,
            "Rules and expected check rules has not the same array lenght.Please add missing or remove old rules from one of them"
        ).is.equal(expectRules.length)

        for (let i = 0; i < rules.length; i++) {
            it('Multiple environment rule', async () => {
                const resultRule = rules[i]
                const expectedRule = expectRules[i]

                const ruleString = uniqueStringify(resultRule)
                const expectRuleString = uniqueStringify(expectedRule)

                expect(
                    ruleString,
                    "Rule with index '" + i + "' is not the same as expected rule"
                ).is.equals(expectRuleString)
            })
        }
    })
})
describe('Rule edge-cases', () => {
    it('Rule with wildcards', () => {
        const rawRules: RawRules = {
            "*.example.com/*": "STATIC:/path/to/target",
        }
        const resultRule = rule.parseRules(rawRules)[0]
        const expectedRule = {
            originUrl: '*.example.com/*',
            originHost: '*.example.com',
            originPath: '/*',
            hostParts: ['com', 'example', '*'],
            pathParts: ['*'],
            hasWildCard: true,
            hostVars: [],
            pathVars: [],
            targetType: 'STATIC',
            targetValue: '/path/to/target',
            raw: '*.example.com/*=STATIC:/path/to/target',
            target: '/path/to/target',
            type: 'STATIC'
        }

        const ruleString = uniqueStringify(resultRule)
        const expectRuleString = uniqueStringify(expectedRule)

        expect(
            ruleString,
            "Role not match expected rule"
        ).is.equals(expectRuleString)
    })

    it('Empty rule', () => {
        const rawRules: RawRules = {}
        expect(
            () => rule.parseRules(rawRules),
            "A empty rule should raise an error during parsing"
        ).to.throw()
    })

    it('Empty origin string', () => {
        const rawRules: RawRules = {
            "": "STATIC:/path/to/target",
        }
        expect(
            () => rule.parseRules(rawRules),
            "A rule with an empty origin string should raise an error during parsing"
        ).to.throw()
    })

    it('Target as origin and missing target', () => {
        const rawRules: RawRules = {
            "STATIC:/path/to/target": "",
        }
        expect(
            () => rule.parseRules(rawRules),
            "A rule with a target as origin should raise an error during parsing"
        ).to.throw()
    })

    it('Missing target path in static target rule', () => {
        const rawRules: RawRules = {
            "example.com": "STATIC:",
        }
        expect(
            () => rule.parseRules(rawRules),
            "A rule with a missing target path in STATIC rule should raise an error during parsing"
        ).to.throw()
    })

    it('Missing target url for PROXY target rule', () => {
        const rawRules: RawRules = {
            "example.com": "PROXY:",
        }
        expect(
            () => rule.parseRules(rawRules),
            "A rule with a missing target url for a PROXY rule should raise an error during parsing"
        ).to.throw()
    })

    it('Missing target url for REDIRECT rule', () => {
        const rawRules: RawRules = {
            "example.com": "REDIRECT:",
        }
        expect(
            () => rule.parseRules(rawRules),
            "A rule with a missing target url for a REDIRECT rule should raise an error during parsing"
        ).to.throw()
    })

    it('Missing target path and seperator in static target rule', () => {
        const rawRules: RawRules = {
            "example.com": "STATIC",
        }
        expect(
            () => rule.parseRules(rawRules),
            "A rule with a missing target path and seperator in STATIC rule should raise an error during parsing"
        ).to.throw()
    })

    it('Missing target url and seperator for PROXY target rule', () => {
        const rawRules: RawRules = {
            "example.com": "PROXY",
        }
        expect(
            () => rule.parseRules(rawRules),
            "A rule with a missing target url and seperator for a PROXY rule should raise an error during parsing"
        ).to.throw()
    })

    it('Missing target url and seperator for REDIRECT rule', () => {
        const rawRules: RawRules = {
            "example.com": "REDIRECT",
        }
        expect(
            () => rule.parseRules(rawRules),
            "A rule with a missing target url and seperator for a REDIRECT rule should raise an error during parsing"
        ).to.throw()
    })

    it('Invalid rule type', () => {
        const rawRules: RawRules = {
            "example.com": "INVALID_TYPE:/path/to/target",
        }
        expect(
            () => rule.parseRules(rawRules),
            "An invalid rule type should raise an error"
        ).to.throw()
    })

    it('Rule with host and path variables', () => {
        const rawRules: RawRules = {
            "$host.example.$domain/*": "STATIC:/path/to/target",
        }
        expect(
            () => rule.parseRules(rawRules),
            "A rule with named variables should raise an error during parsing"
        ).to.not.throw()
    })

    it('Invalid target url for PROXY rule', () => {
        const rawRules: RawRules = {
            "example.com": "PROXY:invalid_target",
        }
        const resultRule = rule.parseRules(rawRules)[0]
        /*
        expect(
            () => rule.parseRules(rawRules),
            "A rule with an invalid target url for a PROXY rule should raise an error"
        ).to.throw()
        */
    })


    it('Invalid target url for REDIRECT rule', () => {
        const rawRules: RawRules = {
            "example.com": "REDIRECT:invalid_target",
        }
        const resultRule = rule.parseRules(rawRules)[0]
        /*
        expect(
            () => rule.parseRules(rawRules),
            "A rule with an invalid target url for a REDIRECT rule should raise an error"
        ).to.throw()
        */
    })

    it('Invalid target path for STATIC rule', () => {
        const rawRules: RawRules = {
            "example.com": "STATIC:https://test.test.com/test",
        }
        const resultRule = rule.parseRules(rawRules)[0]
        /*
        expect(
            () => rule.parseRules(rawRules),
            "A rule with an invalid target path for a STATIC rule should raise an error"
        ).to.throw()
        */
    })


})