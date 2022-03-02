import { fixPath } from "./certs"
import { parseRequestUrl } from './consts';

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
    hostVars: number[],
    pathVars: number[],
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
    useProcessArguments: boolean = true,
    verbose: boolean = false
): RawRules {
    const rawSettings: RawRules = {}

    if (!environmentPrefix && !useProcessArguments) {
        throw new Error("No environment variable prefix and allowed to use process arguments")
    }

    // check all environment variables that start with environmentPrefix
    let i = 1
    verbose && console.log("Load environment vars with '" + environmentPrefix + "' as prefix:")
    if (environmentPrefix) {
        while (true) {
            const rawRule = process.env[environmentPrefix + i]
            verbose && console.log(" - '" + environmentPrefix + i + "': ", rawRule)
            if (!rawRule) {
                break
            }
            const index = rawRule.indexOf("=")
            const key = rawRule.substring(0, index)
            const value = rawRule.substring(index + 1)
            rawSettings[key] = value
            i++
        }
    }
    verbose && console.log("Load process arguments:")
    if (useProcessArguments) {
        const args = process.argv.slice(2)
        i = 0
        while (i < args.length) {
            const arg = args[i]
            verbose && console.log(" - " + i + ": ", arg)
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
    const data = parseRequestUrl(host, path)

    return {
        ...data,
        hasWildCard: data.host.includes("*"),
        raw: requestSource + "=" + responseTarget,
        hostVars: [],
        pathVars: [],
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
        while (index != -1) {
            endIndex = domain.indexOf("}", index)
            if (endIndex == -1) {
                throw new Error("Invalid proxy target domain: Unclosed variable: " + responseTarget)
            }
            const variable = target.substring(index + 1, endIndex)
            const variableNumber = Number(variable)
            if (isNaN(variableNumber)) {
                throw new Error("Invalid proxy target domain: Invalid variable number: " + variable)
            }
            if (variableNumber < 0) {
                base.hostVars.push(-variableNumber)
            } else {
                base.pathVars.push(variableNumber)
            }
            index = domain.indexOf("{", endIndex)
        }
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
        domain.split(".").forEach((domainPart) => {
            if (domainPart != "*" && !/^[a-zA-Z0-9-.]+$/.test(domainPart)) {
                throw new Error("Invalid domain in redirect target: " + domain + "\nresponseTarget: " + responseTarget)
            }
        })

        // get variables numbers from domain, and path
        index = domain.indexOf("{")
        let endIndex: number
        while (index != -1) {
            endIndex = domain.indexOf("}", index)
            if (endIndex == -1) {
                throw new Error("Invalid proxy target domain: Unclosed variable: " + responseTarget)
            }
            const variable = target.substring(index + 1, endIndex)
            const variableNumber = Number(variable)
            if (isNaN(variableNumber)) {
                throw new Error("Invalid proxy target domain: Invalid variable number: " + variable)
            }
            if (variableNumber < 0) {
                base.hostVars.push(-variableNumber)
            } else {
                base.pathVars.push(variableNumber)
            }
            index = domain.indexOf("{", endIndex)
        }
        index = path.indexOf("{")
        while (index != -1) {
            endIndex = path.indexOf("}", index)
            if (endIndex == -1) {
                throw new Error("Invalid proxy target path: Unclosed variable: " + responseTarget)
            }
            const variable = path.substring(index + 1, endIndex)
            const variableNumber = Number(variable)
            if (isNaN(variableNumber)) {
                throw new Error("Invalid proxy target path: Invalid variable number: " + variable)
            }
            if (variableNumber < 0) {
                base.hostVars.push(-variableNumber)
            } else {
                base.pathVars.push(variableNumber)
            }
            index = path.indexOf("{", endIndex)
        }

        const rule: RedirectRule = {
            ...base,
            target: [protocol, domain, port, path],
            type: "REDIRECT"
        }
        return rule
    } else if (responseTarget.startsWith("STATIC:")) {
        const target = fixPath(responseTarget.substring(7))
        // get variables numbers from domain, and path
        let index: number = target.indexOf("{")
        let endIndex: number
        while (index != -1) {
            endIndex = target.indexOf("}", index)
            if (endIndex == -1) {
                throw new Error("Invalid proxy target domain: Unclosed variable: " + responseTarget)
            }
            const variable = target.substring(index + 1, endIndex)
            const variableNumber = Number(variable)
            if (isNaN(variableNumber)) {
                throw new Error("Invalid proxy target domain: Invalid variable number: " + variable)
            }
            if (variableNumber < 0) {
                base.hostVars.push(-variableNumber)
            } else {
                base.pathVars.push(variableNumber)
            }
            index = target.indexOf("{", endIndex)
        }

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
