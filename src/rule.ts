import { uniqueStringify } from "majotools/dist/json"
import * as path from "path"
import { fixPath } from "./certs"
import { parseRequestUrl } from './reqdata'

export interface RawRules {
    [key: string]: string
}

export interface ProxyTarget {
    secure: boolean,
    host: string,
    port: number,
    allowProxyRequestHeader: boolean,
}
export interface SplitedURL {
    protocol: string,
    host: string,
    port: number,
    path: string,
}

export type RuleType = "STATIC" | "PROXY" | "REDIRECT"

export interface BaseRule {
    raw: string,
    targetType: string,
    targetValue: string,
    hasWildCard: boolean,
    hostVars: number[],
    pathVars: number[],

    originUrl: string,
    originHost: string,
    originPath: string,
    hostParts: string[],
    pathParts: string[],
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
    if (!rawRules || rawRules == null || Array.isArray(rawRules)) {
        throw new Error(
            "Provided raw rules must be an array: '" + typeof rawRules + "'"
        )
    } else if (Object.keys(rawRules).length == 0) {
        throw new Error(
            "Provided raw rules must contain at least one rule"
        )
    }
    let rules: Rules = []
    for (let key of Object.keys(rawRules)) {
        let rule: Rule = parseRule(key, rawRules[key])
        if (rule) {
            rules.push(rule)
        }
    }
    return rules
}

export function getBaseRule(origin: string, target: string): BaseRule {
    if (origin.length == 0) {
        throw new Error("Rule origin can't be an empty string")
    } else if (target.length == 0) {
        throw new Error("Rule target can't be an empty string")
    } else if (!target.includes(":")) {
        throw new Error("Rule target dont include a target type seperator ':': '" + target + "'")
    }

    const data = parseRequestUrl(origin)

    const targetIndex = target.indexOf(":")
    if (targetIndex == -1) {
        throw new Error(
            "Rule target for '" + origin +
            "' dont include a target type seperator ':' in: '" + target + "'"
        )
    }

    const targetType = target.substring(0, targetIndex)
    if (targetType.length == 0) {
        throw new Error("Rule target type is empty: '" + target + "'")
    }

    const targetValue = target.substring(targetIndex + 1)
    if (targetValue.length == 0) {
        throw new Error("Rule target value is empty: '" + target + "'")
    }

    return {
        ...data,
        hasWildCard: data.originHost.includes("*"),
        hostVars: [],
        pathVars: [],

        targetType,
        targetValue,
        raw: origin + "=" + targetType + ":" + targetValue,
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


export function splitUrl(
    baseRule: BaseRule,
    target: string,
    defaultProtocol: string | undefined = undefined,
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
        if (defaultProtocol == undefined) {
            throw new Error(
                "Invalid target: No protocol defined: '" + target + "'"
            )
        }
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

    host
        .split(".")
        .forEach((hostPart) => {
            if (
                hostPart.length < 1 && hostPart != "*" &&
                !/^[a-zA-Z0-9-.]+$/.test(hostPart)
            ) {
                throw new Error(
                    "Invalid Host: " +
                    hostPart + " \nresponseTarget: " +
                    target + "\nResult: " +
                    uniqueStringify([
                        protocol,
                        host,
                        port,
                        path
                    ])
                )
            }
        })

    return {
        protocol,
        host,
        port,
        path,
    }
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

export class ProxyTargetParseNotAllowedPathError extends Error { }

export function parseSplittedURLtoProxyTarget(
    splitedURL: SplitedURL
): ProxyTarget {
    let path2 = splitedURL.path
    while (
        path2.startsWith(" ") ||
        path2.startsWith("/") ||
        path2.startsWith("\\")
    ) {
        path2 = path2.substring(1)
    }
    while (
        path2.endsWith(" ") ||
        path2.endsWith("/") ||
        path2.endsWith("\\")
    ) {
        path2 = path2.slice(0, -1)
    }
    if (path2.length != 0) {
        throw new ProxyTargetParseNotAllowedPathError(
            "A proxy target not allow to use a path in its target url: '" + splitedURL.path + "'"
        )
    }

    return {
        secure:
            splitedURL.protocol.endsWith("https") ||
            splitedURL.protocol.endsWith("wss"),
        host: splitedURL.host,
        port: splitedURL.port,
        allowProxyRequestHeader:
            splitedURL.protocol.startsWith("proxy"),
    }
}

export function getProxyTargetId(
    proxyTarget: ProxyTarget
): string {
    return (
        proxyTarget.allowProxyRequestHeader ?
            "proxy-" :
            ""
    ) +
        (
            proxyTarget.secure ?
                "https" :
                "http"
        ) +
        proxyTarget.host + ":" +
        proxyTarget.port
}

export function parseRule(
    requestOrigin: string,
    responseTarget: string
): Rule {
    const baseRule = getBaseRule(requestOrigin, responseTarget)
    validateBaseRule(baseRule)
    if (baseRule.targetType == "PROXY") {
        const targets = splitUrls(
            baseRule,
            baseRule.targetValue
        ).map(parseSplittedURLtoProxyTarget)
        const rule: ProxyRule = {
            ...baseRule,
            target: targets,
            type: "PROXY"
        }
        validateProxyRule(rule)
        return rule
    } else if (baseRule.targetType == "REDIRECT") {
        const targets = splitUrls(
            baseRule,
            baseRule.targetValue
        )
        const rule: RedirectRule = {
            ...baseRule,
            target: targets,
            type: "REDIRECT"
        }
        validateRedirectRule(rule)
        return rule
    } else if (baseRule.targetType == "STATIC") {
        const rule: StaticRule = {
            ...baseRule,
            target: fixPath(baseRule.targetValue),
            type: "STATIC"
        }

        validateStaticRule(rule)
        return rule
    } else {
        throw new Error(
            "Invalid setting type: '" + baseRule.targetType + "' for '" + baseRule.targetValue + "'"
        )
    }
}

export function sortRules(rules: Rules): Rules {
    return [...rules].sort((a, b) => {
        if (a.hostParts.length != b.hostParts.length) {
            return b.hostParts.length - a.hostParts.length
        }
        if (b.originHost.includes("*")) {
            if (!a.originHost.includes("*")) {
                return -1
            }
        } else if (a.originHost.includes("*")) {
            return 1
        }
        if (a.originHost.length != b.originHost.length) {
            return b.originHost.length - a.originHost.length
        }
        return b.originPath.length - a.originPath.length
    })
}

export function validateBaseRule(value: BaseRule): void {
    if (!value) {
        throw new Error("Invalid BaseRule: Value is undefined or null: '" + typeof value + "'")
    }

    if (!value.originUrl || typeof value.originUrl !== "string") {
        throw new Error("Invalid BaseRule: 'originUrl' must be a non-empty string: '" + value.originUrl + "'")
    }

    if (!value.originHost || typeof value.originHost !== "string") {
        throw new Error("Invalid BaseRule: 'originHost' must be a non-empty string: '" + value.originHost + "'")
    }

    if (!value.originPath || typeof value.originPath !== "string") {
        throw new Error("Invalid BaseRule: 'originPath' must be a non-empty string: '" + value.originPath + "'")
    }

    if (!value.raw || typeof value.raw !== "string") {
        throw new Error("Invalid BaseRule: 'raw' must be a non-empty string: '" + value.raw + "'")
    }

    if (!value.targetType || typeof value.targetType !== "string") {
        throw new Error("Invalid BaseRule: 'targetType' must be a non-empty string: '" + value.targetType + "'")
    }

    if (!value.targetValue || typeof value.targetValue !== "string") {
        throw new Error("Invalid BaseRule: 'targetValue' must be a non-empty string: '" + value.targetValue + "'")
    }

    if (!Array.isArray(value.hostParts)) {
        throw new Error("Invalid BaseRule: 'hostParts' must be an array: '" + typeof value.hostParts + "'")
    }

    if (!Array.isArray(value.pathParts)) {
        throw new Error("Invalid BaseRule: 'pathParts' must be an array: '" + typeof value.pathParts + "'")
    }

    if (typeof value.hasWildCard !== "boolean") {
        throw new Error("Invalid BaseRule: 'hasWildCard' must be a boolean: '" + typeof value.hasWildCard + "'")
    }

    if (!Array.isArray(value.hostVars)) {
        throw new Error("Invalid BaseRule: 'hostVars' must be an array: '" + typeof value.hostVars + "'")
    }

    if (!Array.isArray(value.pathVars)) {
        throw new Error("Invalid BaseRule: 'pathVars' must be an array: '" + typeof value.pathVars + "'")
    }
}

export function validateStaticRule(value: StaticRule): void {
    if (value.type !== "STATIC") {
        throw new Error("Invalid StaticRule: 'type' must be 'STATIC'.")
    }

    if (!value.target || typeof value.target !== "string") {
        throw new Error("Invalid StaticRule: 'target' must be a non-empty string.")
    }

    if (value.target.includes("://")) {
        throw new Error(
            "Invalid StaticRule: 'target' cant contain '://': ' " + value.target + "'"
        )
    }

    if (!path.isAbsolute(value.target)) {
        throw new Error(
            "Invalid StaticRule: 'target' must be an absolute path."
        )
    }
}

export function validateProxyRule(value: ProxyRule): void {
    if (value.type !== "PROXY") {
        throw new Error("Invalid ProxyRule: 'type' must be 'PROXY'.")
    }

    if (!Array.isArray(value.target) || value.target.length === 0) {
        throw new Error("Invalid ProxyRule: 'target' must be a non-empty array.")
    }

    value.target.forEach((target, index) => {
        if (!target.host || typeof target.host !== "string") {
            throw new Error(
                `Invalid ProxyRule (target[${index}]): 'host' must be a non-empty string.`
            )
        }

        if (!target.port || typeof target.port !== "number") {
            throw new Error(
                `Invalid ProxyRule (target[${index}]): 'port' must be a number.`
            )
        }
    })
}

export function validateRedirectRule(value: RedirectRule): void {
    if (value.type !== "REDIRECT") {
        throw new Error("Invalid RedirectRule: 'type' must be 'REDIRECT'.")
    }

    if (!Array.isArray(value.target) || value.target.length === 0) {
        throw new Error("Invalid RedirectRule: 'target' must be a non-empty array.")
    }

    value.target.forEach((target, index) => {
        if (!target.protocol || typeof target.protocol !== "string") {
            throw new Error(`Invalid RedirectRule (target[${index}]): 'protocol' must be a string.`)
        }

        if (!target.host || typeof target.host !== "string") {
            throw new Error(`Invalid RedirectRule (target[${index}]): 'host' must be a string.`)
        }

        if (!target.port || typeof target.port !== "number") {
            throw new Error(`Invalid RedirectRule (target[${index}]): 'port' must be a number.`)
        }

        if (!target.path || typeof target.path !== "string") {
            throw new Error(`Invalid RedirectRule (target[${index}]): 'path' must be a string.`)
        }
    })
}