import { ForkOptions } from 'child_process';
import { parse } from 'path';

export interface RuleOptions {
    [key: string]: string | number | boolean,
}

export interface Rule {
    on: string,
    value: string,
    type: string,
    options: RuleOptions,
}

export type Rules = Rule[]

export function parseRuleOptions(obj: any): RuleOptions {
    if (typeof obj != "object") {
        throw new Error("Options is type of '" + typeof obj + "' and not type of 'object' for a RuleOptions")
    } else if (obj == "null") {
        throw new Error("Options object is null and not a valid javascript key-value object for a RuleOptions")
    } else if (Array.isArray(obj)) {
        throw new Error("Options object is any array and not a valid javascript key-value object for a RuleOptions")
    }
    for (const key of Object.keys(obj)) {
        if (
            typeof obj[key] != "string" ||
            typeof obj[key] != "number" ||
            typeof obj[key] != "boolean"
        ) {
            throw new Error(
                "Typeof '" +
                typeof obj[key] +
                "' is not allowed as value of RuleOptions"
            )
        }
    }
    return obj
}

export function parseRawRule(
    raw: string,
): Rule {
    let index: number = raw.indexOf("=")
    if (index == -1) {
        throw new Error("Can't parse '" + raw + "' to RawRule because it not contains a '=' as 'on' and 'value' seperator!")
    }
    const on: string = raw.substring(0, index)
    let value: string = raw.substring(index + 1)
    let options: RuleOptions | undefined = undefined
    index = raw.lastIndexOf("}:")
    if (index != -1) {
        const startIndex = raw.indexOf("{")
        const rawOptions = value.substring(startIndex, index + 1)
        try {
            options = parseRuleOptions(
                eval(
                    rawOptions
                )
            )
        } catch (err: Error | any) {
            const err2 = new Error(
                "Can't parse '" + raw + "' to RawRule because:\n" + (
                    err.message ?? err.msg ?? err
                )
            )
            if (err.stack) {
                err2.stack = err.stack
            }
            throw err2
        }
        value = value.substring(0, startIndex) + value.substring(index + 1)
    }
    index = raw.indexOf(":")
    if (index == -1) {
        throw new Error("Can't parse '" + raw + "' to RawRule because it not contains a ':' after the '=' as 'type' and 'value' seperator!")
    }
    const type: string = raw.substring(0, index)
    value = raw.substring(index + 1)
    return {
        on: on,
        value: value,
        type: type,
        options: options ?? {},
    }
}

export function loadObjectRawRules(
    obj: { [key: string]: any },
    envVarPrefix: string | undefined = "RULE_",
    envVarSuffix?: string,
    ignoreErrors: boolean = false,
): Rule[] {
    const rawRules: Rule[] = []
    for (const key of Object.keys(obj)) {
        if (
            envVarPrefix &&
            !obj[key].startsWith(envVarPrefix)
        ) {
            continue
        }
        if (
            envVarSuffix &&
            !obj[key].endsWith(envVarSuffix)
        ) {
            continue
        }
        try {
            if (typeof obj[key] != "string") {
                throw new Error("The value of '" + key + "' is not a string")
            }
            rawRules.push(
                parseRawRule(
                    obj[key]
                )
            )
        } catch (err) {
            if (!ignoreErrors) {
                throw err
            }
        }
    }
    return rawRules
}

export function loadStringArrayRawRules(
    arr: any[],
    ignoreErrors: boolean = false,
): Rule[] {
    const rawRules: Rule[] = []
    for (const value of arr) {
        try {
            if (typeof value != "string") {
                throw new Error("The value of '" + value + "' is not a string")
            }
            rawRules.push(
                parseRawRule(
                    value
                )
            )
        } catch (err) {
            if (!ignoreErrors) {
                throw err
            }
        }
    }
    return rawRules
}

export function loadEnvironmentRawRules(
    envVarPrefix?: string,
    envVarSuffix?: string,
    ignoreErrors?: boolean,
): Rule[] {
    return loadObjectRawRules(
        process.env,
        envVarPrefix,
        envVarSuffix,
        ignoreErrors,
    )
}

export function loadArgumentRawRules(
    ignoreErrors?: boolean,
): Rule[] {
    return loadStringArrayRawRules(
        process.argv.slice(2),
        ignoreErrors,
    )
}

