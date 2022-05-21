import { fixPath } from "./certs"
import { parseRequestUrl } from './reqdata';

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
    target: ProxyTarget[]
}

export interface RedirectRule extends BaseRule {
    type: "REDIRECT"
    target: SplitedURL[]
}

export type Rule = RedirectRule | ProxyRule | StaticRule

export type Rules = Rule[]

// create function that loads raw settings from environment and process arguments
export function loadRawRules(
    processArgs: string[] = [],
    environmentPrefix: string | null = "RULE_",
    verbose: boolean = false
): RawRules {
    const rawSettings: RawRules = {}

    // check all environment variables that start with environmentPrefix
    let i = 1
    if (environmentPrefix) {
        verbose && console.debug("Load environment vars with '" + environmentPrefix + "' as prefix:")
        while (true) {
            const rawRule = process.env[environmentPrefix + i]
            verbose && console.debug(" - '" + environmentPrefix + i + "': ", rawRule)
            if (!rawRule) {
                break
            }
            const index = rawRule.indexOf("=")
            const key = rawRule.substring(0, index)
            const value = rawRule.substring(index + 1)
            rawSettings[key] = value
            i++
        }
    } else {
        verbose && console.debug("Environment var prefix not defined")
    }
    if (processArgs.length > 0) {
        verbose && console.debug(processArgs.length + " process arguments found")
        i = 0
        while (i < processArgs.length) {
            const arg = processArgs[i]
            verbose && console.debug(" - " + i + ": ", arg)
            const index = arg.indexOf("=")
            if (index != -1) {
                const key = arg.substring(0, index)
                const value = arg.substring(index + 1)
                rawSettings[key] = value
            }
            i++
        }
    } else {
        verbose && console.debug("No process arguments defined")
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

export function splitAtFirst(
    value: string,
    searchFor: string
): [string, string] {
    if (searchFor.length < 1) {
        throw new Error("Can't find a string value with a length of '" + searchFor.length + "'!")
    }
    const index: number = value.indexOf(searchFor)
    if (index < 0) {
        return ["", value]
    }
    return [
        value.substring(0, index),
        value.substring(index + searchFor.length),
    ]
}

export function splitAtLast(
    value: string,
    searchFor: string
): [string, string] {
    if (searchFor.length < 1) {
        throw new Error("Can't find a string value with a length of '" + searchFor.length + "'!")
    }
    const index: number = value.lastIndexOf(searchFor)
    if (index < 0) {
        return [value, ""]
    }
    return [
        value.substring(0, index),
        value.substring(index + searchFor.length),
    ]
}

export type ProxyTarget = [boolean, string, number]
export type SplitedURL = [string, string, number, string]
export function splitUrl(
    baseRule: BaseRule,
    target: string,
    defaultProtocol: string = "https",
    defaultPort: number = 80,
    defaultSecuresPort: number = 443,
): SplitedURL {
    let index: number = target.indexOf("{")
    let endIndex: number
    while (index != -1) {
        endIndex = target.indexOf("}", index)
        if (endIndex == -1) {
            throw new Error("Invalid target: Unclosed variable: " + target)
        }
        const variable = target.substring(index + 1, endIndex)
        const variableNumber = Number(variable)
        if (isNaN(variableNumber)) {
            throw new Error("Invalid target: Invalid variable number: " + variable)
        }
        if (variableNumber < 0) {
            baseRule.hostVars.push(-variableNumber)
        } else {
            baseRule.pathVars.push(variableNumber)
        }
        index = target.indexOf("{", endIndex)
    }

    let protocol: string
    let host: string
    let port: number
    let path: string

    let splitted: [string, string]

    splitted = splitAtFirst(target, "://")
    if (splitted[0].length == 0) {
        protocol = defaultProtocol
    } else {
        protocol = splitted[0]
    }
    if (!splitted[1].includes("/")) {
        splitted[1] = splitted[1] + "/"
    }
    splitted = splitAtFirst(splitted[1], "/")
    if (splitted[1].length == 0) {
        path = "/"
    } else {
        path = "/" + splitted[1]
    }
    if (
        splitted[0].endsWith("]") &&
        splitted[0].startsWith("[")
    ) {
        host = splitted[0]
        port = protocol == "https" || protocol == "wss" ? defaultSecuresPort : defaultPort
    } else {
        splitted = splitAtLast(splitted[0], ":")
        if (splitted[1].length == 0) {
            host = splitted[0]
            port = protocol == "https" || protocol == "wss" ? defaultSecuresPort : defaultPort
        } else {
            host = splitted[0]
            port = Number(splitted[1])
        }
    }

    if (
        isNaN(port) ||
        !(port > -1 && port < 65536)
    ) {
        throw new Error(
            "Invalid URL: Invalid Port: '" +
            splitted[1] +
            "' (just 0-65536 is allowed)"
        )
    }

    host.split(".").forEach((hostPart) => {
        if (hostPart.length < 1 && hostPart != "*" && !/^[a-zA-Z0-9-.]+$/.test(hostPart)) {
            throw new Error("Invalid Host: " + hostPart + " \nresponseTarget: " + target + "\nResult: " + JSON.stringify([
                protocol,
                host,
                port,
                path
            ], null, 4))
        }
    })

    return [
        protocol,
        host,
        port,
        path
    ]
}

export function splitUrls(
    baseRule: BaseRule,
    target: string,
    defaultProtocol: string = "https",
    defaultPort: number = 80,
    defaultSecuresPort: number = 443,
): SplitedURL[] {
    return target.split(",").map(
        (v) => splitUrl(
            baseRule,
            v,
            defaultProtocol,
            defaultPort,
            defaultSecuresPort,
        )
    )
}

export function parseRule(requestSource: string, responseTarget: string): Rule {
    const baseRule = getBaseRule(requestSource, responseTarget)
    if (responseTarget.startsWith("PROXY:")) {
        const targets = splitUrls(
            baseRule,
            responseTarget.substring(6)
        ).map((t): ProxyTarget => [
            t[0] == "https" || t[0] == "wss",
            t[1],
            t[2],
        ])
        const rule: ProxyRule = {
            ...baseRule,
            target: targets,
            type: "PROXY"
        }
        return rule
    } else if (responseTarget.startsWith("REDIRECT:")) {
        const targets = splitUrls(
            baseRule,
            responseTarget.substring(9)
        )

        const rule: RedirectRule = {
            ...baseRule,
            target: targets,
            type: "REDIRECT"
        }
        return rule
    } else if (responseTarget.startsWith("STATIC:")) {
        const target = splitUrl(
            baseRule,
            "file://*" + fixPath(responseTarget.substring(7))
        )

        const rule: StaticRule = {
            ...baseRule,
            target: target[3],
            type: "STATIC"
        }
        return rule
    } else {
        throw new Error("Invalid setting type: " + responseTarget)
    }
}

export function sortRules(rules: Rules): Rules {
    return [...rules].sort((a, b) => {
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
