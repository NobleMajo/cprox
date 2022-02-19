export interface RawRules {
    [key: string]: string
}

export interface BaseRule {
    host: string,
    path: string,
    hostParts: string[],
    pathParts: string[],
    hasWildCard: boolean,
    raw: string,
    variables: number[],
}

export interface StaticRule extends BaseRule {
    type: "STATIC"
    target: string // Path to the folder
}

export interface ProxyRule extends BaseRule {
    type: "PROXY"
    target: [string, number] // [host, port]
}

export interface RedirectRule extends BaseRule {
    type: "REDIRECT"
    target: [string, string, number, string] // [protocol, domain, port, path]
}

export type Rule = RedirectRule | ProxyRule | StaticRule

export type Rules = Rule[]

// create function that loads raw settings from environment and process arguments
export function loadRawRules(
    environmentPrefix: string | null = "RULE_",
    useProcessArguments: boolean = true
): RawRules {
    const rawSettings: RawRules = {}

    if (!environmentPrefix && !useProcessArguments) {
        throw new Error("No environment variable prefix and allowed to use process arguments")
    }

    // check all environment variables that start with environmentPrefix
    let i = 1
    if (environmentPrefix) {
        while (true) {
            const RawRules = process.env[environmentPrefix + i]
            if (!RawRules) {
                break
            }
            const index = RawRules.indexOf("=")
            const key = RawRules.substring(0, index)
            const value = RawRules.substring(index + 1)
            rawSettings[key] = value
            i++
        }
    }
    if (useProcessArguments) {
        const args = process.argv.slice(2)
        i = 0
        while (i < args.length) {
            const arg = args[i]
            const index = arg.indexOf("=")
            if (index != -1) {
                const key = arg.substring(0, index)
                const value = arg.substring(index + 1)
                rawSettings[key] = value
            }
            i++
        }
    }
    return rawSettings
}

// create function that convert raw settings to rules
export function parseRules(rawRules: RawRules): Rules {
    let rules: Rules = []
    for (let key in rawRules) {
        let rule: Rule = parseRule(key, rawRules[key])
        if (rule) {
            rules.push(rule)
        }
    }
    return rules
}

export function getBaseRule(requestSource: string, responseTarget: string): BaseRule {
    const index = requestSource.indexOf("/")
    const host = index != -1 ?
        (
            index != 0 ?
                requestSource.substring(0, index) :
                "*"
        ) :
        requestSource
    const path = index != -1 ?
        requestSource.substring(index) :
        "/"
    const hostParts = host.split(".").reverse()
    let wildcard: boolean = false
    for (let index = hostParts.length; index > hostParts.length; index--) {
        const part = hostParts[index]
        if (part == "*") {
            wildcard = true
        } else if (!/^\/?[a-zA-Z0-9-_\/]+$/.test(part)) {
            throw new Error("Invalid host part: " + part)
        }
    }
    const pathParts = path.split("/")
    if (pathParts[0] == "") {
        pathParts.shift()
    }

    return {
        host,
        path,
        hasWildCard: wildcard,
        hostParts: hostParts,
        pathParts: pathParts,
        raw: requestSource + "=" + responseTarget,
        variables: [],
    }
}

export function parseRule(requestSource: string, responseTarget: string): Rule {
    const base = getBaseRule(requestSource, responseTarget)
    if (responseTarget.startsWith("PROXY:")) {
        const target = responseTarget.substring(6)
        let domain: string
        let port: number
        // split target into host and port
        const portStart = target.lastIndexOf(":")
        if (portStart == -1) {
            domain = target
            port = 443
        } else {
            domain = target.substring(0, portStart)
            port = Number(target.substring(portStart + 1))
            if (isNaN(port)) {
                throw new Error("Invalid proxy target port:  " + responseTarget)
            }
        }
        // get variables numbers from domain
        let index: number = domain.indexOf("{")
        let endIndex: number
        do {
            endIndex = domain.indexOf("}", index)
            if (endIndex == -1) {
                throw new Error("Invalid proxy target domain: Unclosed variable: " + responseTarget)
            }
            const variable = target.substring(index + 1, endIndex)
            const variableNumber = Number(variable)
            if (isNaN(variableNumber)) {
                throw new Error("Invalid proxy target domain: Invalid variable number: " + variable)
            }
            base.variables.push(variableNumber)
            index = domain.indexOf("{")
        } while (index != -1)
        const rule: ProxyRule = {
            ...base,
            target: [domain, port],
            type: "PROXY"
        }
        return rule
    } else if (responseTarget.startsWith("REDIRECT:")) {
        const target = responseTarget.substring(9)
        // rule.target is a url that can support every protocol
        // check if redirect target is a valid url
        let index = target.indexOf("://")
        let protocol = target.substring(0, index)
        if (protocol.length == 0) {
            protocol = "https"
        }
        const restTarget = target.substring(index + 3)
        let path: string
        let host: string
        index = restTarget.indexOf("/")
        if (index == -1) {
            host = restTarget
            path = "/"
        } else {
            host = restTarget.substring(0, index)
            path = restTarget.substring(index)
        }
        if (host.length == 0) {
            throw new Error("Host in redirect target to short: " + responseTarget)
        }
        let domain: string
        let port: number
        index = host.lastIndexOf(":")
        if (index == -1) {
            domain = host
            port = 443
        } else {
            domain = host.substring(0, index)
            port = Number(host.substring(index + 1))
            if (isNaN(port)) {
                throw new Error("Port in redirect target is not a number: " + responseTarget)
            }
        }
        if (domain.length == 0) {
            throw new Error("Domain : " + responseTarget)
        }
        // throw error if domain is not a valid domain
        domain.split(".")
            .forEach((domainPart) => {
                if (domainPart != "*" && !/^[a-zA-Z0-9-.]+$/.test(domainPart)) {
                    throw new Error("Invalid domain in redirect target: " + domain + "\nresponseTarget: " + responseTarget)
                }
            })

        // throw error if path is not a valid path
        if (!/^\/?[a-zA-Z0-9-_.\/]+$/.test(path)) {
            throw new Error("Invalid path in redirect target: " + path + "\nresponseTarget: " + responseTarget)
        }

        // get variables numbers from domain, and path
        index = domain.indexOf("{")
        let endIndex: number
        do {
            endIndex = domain.indexOf("}", index)
            if (endIndex == -1) {
                throw new Error("Invalid proxy target domain: Unclosed variable: " + responseTarget)
            }
            const variable = target.substring(index + 1, endIndex)
            const variableNumber = Number(variable)
            if (isNaN(variableNumber)) {
                throw new Error("Invalid proxy target domain: Invalid variable number: " + variable)
            }
            base.variables.push(variableNumber)
            index = domain.indexOf("{")
        } while (index != -1)
        index = path.indexOf("{")
        do {
            endIndex = path.indexOf("}", index)
            if (endIndex == -1) {
                throw new Error("Invalid proxy target path: Unclosed variable: " + responseTarget)
            }
            const variable = target.substring(index + 1, endIndex)
            const variableNumber = Number(variable)
            if (isNaN(variableNumber)) {
                throw new Error("Invalid proxy target path: Invalid variable number: " + variable)
            }
            base.variables.push(variableNumber)
            index = path.indexOf("{")
        } while (index != -1)

        const rule: RedirectRule = {
            ...base,
            target: [protocol, domain, port, path],
            type: "REDIRECT"
        }
        return rule
    } else if (responseTarget.startsWith("STATIC:")) {
        const target = responseTarget.substring(7)
        //check if target is a valid path
        if (!/^\/[a-zA-Z0-9-_.\/]+$/.test(target)) {
            throw new Error("Invalid path in static target: " + responseTarget)
        }

        // get variables numbers from domain, and path
        let index: number = target.indexOf("{")
        let endIndex: number
        do {
            endIndex = target.indexOf("}", index)
            if (endIndex == -1) {
                throw new Error("Invalid proxy target domain: Unclosed variable: " + responseTarget)
            }
            const variable = target.substring(index + 1, endIndex)
            const variableNumber = Number(variable)
            if (isNaN(variableNumber)) {
                throw new Error("Invalid proxy target domain: Invalid variable number: " + variable)
            }
            base.variables.push(variableNumber)
            index = target.indexOf("{")
        } while (index != -1)

        const rule: StaticRule = {
            ...base,
            target: target,
            type: "STATIC"
        }
        return rule
    } else {
        throw new Error("Invalid setting type: " + responseTarget)
    }
}

export function sortRules(rules: Rules): Rules {
    return rules.sort((a, b) => {
        if (a.hostParts.length != b.hostParts.length) {
            return b.hostParts.length - a.hostParts.length
        }
        if (b.host.includes("*")) {
            if (!a.host.includes("*")) {
                return -1
            }
        } else if (a.host.includes("*")) {
            return 1
        }
        if (a.host.length != b.host.length) {
            return b.host.length - a.host.length
        }
        return b.path.length - a.path.length
    })
}

export const exampleRules: RawRules = {
    "sdasdasd.codec.coreunit.net": "PROXY:codec_test:80",
    "*.codec.coreunit.net": "PROXY:codec_{-4}:80",
    "a.codec.coreunit.net": "PROXY:codec_test:80",
    "test.codec.coreunit.net": "PROXY:codec_test:80",
    "tester.test.i.coreunit.net": "PROXY:test_test",
    "a.test.i.coreunit.net": "PROXY:test_test",
    "*.test.i.coreunit.net": "PROXY:test_{-4}",
    "asdsdssss.test.i.coreunit.net": "PROXY:test_test",
    "coreunit.net": "STATIC:/var/www/main",
    "auth.coreunit.net": "PROXY:keycloak_container:8080",
    "auth.coreunit.net/asdd": "PROXY:keycloak_container:8080",
    "auth.coreunit.net/a": "PROXY:keycloak_container:8080",
    "majo.coreunit.net": "REDIRECT:https://github.com/majo418",
    "sysdev.coreunit.net": "REDIRECT:https://github.com/sysdev",
    "codec.coreunit.net": "STATIC:/var/www/codec",
    "i.coreunit.net": "STATIC:/var/www/intern",
    "i.coreunit.net/certs": "STATIC:/home/netde/certs",
    "discord.coreunit.net": "REDIRECT:https://discord.gg/pwHNaHRa9W",
    "teamspeak.coreunit.net": "REDIRECT:ts3server://coreunit.net",
    "github.coreunit.net": "REDIRECT:https://github.com/coreunitnet",
    "/.well-known": "STATIC:/home/netde/certs/.well-known",
    "/test": "STATIC:/home/netde/certs/.well-known",
    "/qweqwesdsdddsdsdsdsde": "STATIC:/home/netde/certs/.well-known",
}
Object.keys(exampleRules).forEach((key, i) => {
    process.env["PROXY_" + (i + 1)] = key + "=" + exampleRules[key]
})