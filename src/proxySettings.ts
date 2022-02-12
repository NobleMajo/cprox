export interface ProxyRule {
    originHost: string,
    targetHost: string,
    targetPort: number,
    neededDomainLevel: number,
}

export type ProxyResolver = (originHost: string) => [string, number] | null

// export  default function loadProxySettings(): ProxySettings
export function loadProxySettings(
    envVarPrefix: string = "PROXY_",
    useArgs: boolean = true,
): ProxyRule[] {
    // define empty rules array
    const rawRules: string[] = []

    // iterate over every environment var starting with "PROXY{i}" and add them to prodyValues
    for (let i = 1; ; i++) {
        const envVar = process.env[envVarPrefix + i]
        if (typeof envVar != "string") {
            break
        }
        if (envVar.split("=").length != 2) {
            throw new Error(`The environment variable '${envVarPrefix + i}' not contains "=" one time: ${envVar}`)
        }
        rawRules.push(envVar)
    }

    // arg process args to rawRules
    if (useArgs) {
        const args = process.argv.slice(2)
        for (let i = 0; i < args.length; i++) {
            const arg = args[i]
            if (arg.split("=").length != 2) {
                throw new Error(`The ${i + 1}. process argument not contains "=" one time: '${arg}'`)
            }
            rawRules.push(arg)
        }
    }

    const rules: ProxyRule[] = []
    for (let index = 0; index < rawRules.length; index++) {
        const rule = rawRules[index]
        // split value into domain and url by "="
        let [originHost, targetAddress] = rule.split('=')
        //split target by ":" into host and port
        let [targetHost, targetPort2] = targetAddress.split(':')
        // throw error if origin is not a valid host domain
        if (!originHost.match(/^[a-zA-Z0-9-_.]+$/)) {
            throw new Error(`Invalid origin domain host: ${originHost}`)
        }
        // throw error if host is not a valid host domain
        if (!targetHost.match(/^[a-zA-Z0-9-_{}.]+$/)) {
            throw new Error(`Invalid target host: ${targetHost}`)
        }
        // convert port to number and throw error if port is not a number
        const targetPort = Number(targetPort2)
        if (isNaN(targetPort)) {
            throw new Error(`Invalid target port: ${targetPort2}`)
        }

        // the targetHost can container variables like that "{i}"
        // a variable is a number surrounded by "{" and "}" 
        // e.g. "{0}.mydomain.com", "{0}.{2}.{1}.somed.net", "codec_{0}"
        // check what is the greatest number in a variable name in the targetHost string
        let maxVariableNumber = 0
        let startIndex: number = 0
        let endIndex: number = 0
        while (true) {
            startIndex = targetHost.indexOf('{', endIndex)
            if (startIndex == -1) {
                break
            }
            endIndex = targetHost.indexOf('}', startIndex + 1)
            if (endIndex == -1) {
                throw new Error(`Unclosed variable in targetH host: ${targetHost}`)
            }
            const variableNumber = Number(targetHost.substring(startIndex + 1, endIndex))
            if (isNaN(variableNumber)) {
                throw new Error(`Invalid variable number in target host: ${targetHost}`)
            }
            if (variableNumber + 1 > maxVariableNumber) {
                maxVariableNumber = variableNumber + 1
            }
        }
        rules.push({
            originHost: originHost,
            targetHost: targetHost,
            targetPort: targetPort,
            neededDomainLevel: maxVariableNumber,
        })
    }

    return rules.sort(
        (a, b) => b.originHost.length - a.originHost.length
    )
}

export function createProxyResolver(rules: ProxyRule[]): ProxyResolver[] {
    return rules.map((rule) => {
        return (originHost): [string, number] | null => {
            if (!originHost.endsWith(rule.originHost)) {
                return null
            }
            let result = rule.targetHost
            const rest = originHost.substring(0, originHost.length - rule.originHost.length)
            const parts = rest.split(".").reverse()
            if (parts[0] == "") {
                parts.shift()
            }
            // return null if the number of parts is less than the neededDomainLevel
            if (parts.length < rule.neededDomainLevel) {
                return null
            }
            parts.forEach((part, i) => {
                result = result
                    .replace("{" + i + "}", part)
            })
            return [result, rule.targetPort]
        }
    })
}

export function createMergedProxyResolver(rules: ProxyResolver[]): ProxyResolver {
    return (originHost): [string, number] | null => {
        for (let i = 0; i < rules.length; i++) {
            const result = rules[i](originHost)
            if (result != null) {
                return result
            }
        }
        return null
    }
}
