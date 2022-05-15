import 'mocha';
import * as rule from "../rule";
import { RawRules } from '../rule';
import { expect } from 'chai';
import {
    clearEnvironment,
    setEnvironment,
    exampleRules,
    uniqueStringify
} from './assets';

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
        expect(ruleString).is.equals(expectRuleString)
    })
})


describe('sortRules()', () => {
    it('Host rules', async () => {
        const rawRules: RawRules = {
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
            sortRules.map((r) => r.host)
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
            sortRules.map((r) => r.path)
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
            sortRules.map((r) => r.host + r.path)
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
                host: 'test.com',
                path: '/',
                hostParts: ['com', 'test'],
                pathParts: [''],
                hasWildCard: false,
                raw: 'test.com=STATIC:/var/www/test',
                hostVars: [],
                pathVars: [],
                target: '/var/www/test',
                type: 'STATIC'
            }
        ]

        const ruleStirng = uniqueStringify(rule2)
        const expectRuleString = uniqueStringify(expectRule)
        expect(ruleStirng).is.equals(expectRuleString)
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
                host: 'test.com',
                path: '/',
                hostParts: ['com', 'test'],
                pathParts: [''],
                hasWildCard: false,
                raw: 'test.com=STATIC:/var/www/test',
                hostVars: [],
                pathVars: [],
                target: '/var/www/test',
                type: 'STATIC'
            },
            {
                host: 'example.com',
                path: '/',
                hostParts: ['com', 'example'],
                pathParts: [''],
                hasWildCard: false,
                raw: 'example.com=PROXY:example_nginx:18080',
                hostVars: [],
                pathVars: [],
                target: [
                    [true, 'example_nginx', 18080]
                ],
                type: 'PROXY'
            },
            {
                host: 'majo.test.com',
                path: '/',
                hostParts: ['com', 'test', 'majo'],
                pathParts: [''],
                hasWildCard: false,
                raw: 'majo.test.com=REDIRECT:github.com/majo418',
                hostVars: [],
                pathVars: [],
                target: [
                    ['https', 'github.com', 443, '/majo418']
                ],
                type: 'REDIRECT'
            },
            {
                host: 'sysdev.test.com',
                path: '/',
                hostParts: ['com', 'test', 'sysdev'],
                pathParts: [''],
                hasWildCard: false,
                raw: 'sysdev.test.com=REDIRECT:github.com/sysdev',
                hostVars: [],
                pathVars: [],
                target: [
                    ['https', 'github.com', 443, '/sysdev']
                ],
                type: 'REDIRECT'
            },
            {
                host: '*',
                path: '/',
                hostParts: ['*'],
                pathParts: [''],
                hasWildCard: true,
                raw: '*=PROXY:https://nginx_test:8080',
                hostVars: [],
                pathVars: [],
                target: [
                    [true, 'nginx_test', 8080]
                ],
                type: 'PROXY'
            },
            {
                host: '*.example.com',
                path: '/',
                hostParts: ['com', 'example', '*'],
                pathParts: [''],
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
                pathParts: [''],
                hasWildCard: true,
                raw: '*.redirect.com=REDIRECT:https://test.test.com',
                hostVars: [],
                pathVars: [],
                target: [
                    ['https', 'test.test.com', 443, '/']
                ],
                type: 'REDIRECT'
            },
            {
                host: '*.test.com',
                path: '/',
                hostParts: ['com', 'test', '*'],
                pathParts: [''],
                hasWildCard: true,
                raw: '*.test.com=STATIC:/var/www/test',
                hostVars: [],
                pathVars: [],
                target: '/var/www/test',
                type: 'STATIC'
            }
        ]

        const rulesString = uniqueStringify(rules)
        const expectRulesString = uniqueStringify(expectRules)
        expect(rulesString).is.equals(expectRulesString)
    })
})