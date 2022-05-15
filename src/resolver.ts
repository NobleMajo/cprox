import { IncomingMessage, ServerResponse } from "http"
import { Duplex } from "stream"
import { Rule, ProxyRule, StaticRule, RedirectRule, ProxyTarget, SplitedURL } from './rule';
import HttpProxy from "http-proxy"
import serveStatic, { RequestHandler } from "serve-static"
import { CacheHolder, NoCache } from "./cache"
import { RequestData } from './reqdata';
import env from "./env/envParser"
import { Settings } from "http2";

export interface BaseResolver {
    type: "PROXY" | "STATIC" | "REDIRECT",
    rule: Rule,
    http: (
        data: RequestData,
        req: IncomingMessage,
        res: ServerResponse,
    ) => Promise<void> | void,
    ws: (
        data: RequestData,
        req: IncomingMessage,
        socket: Duplex,
        head: Buffer,
    ) => Promise<void> | void,
}

export interface ProxyResolver extends BaseResolver {
    type: "PROXY",
    rule: ProxyRule,
}

export interface StaticResolver extends BaseResolver {
    type: "STATIC",
    rule: StaticRule,
}

export interface RedirectResolver extends BaseResolver {
    type: "REDIRECT",
    rule: RedirectRule
}

export type Resolver = ProxyResolver | StaticResolver | RedirectResolver

export function hostPartsMatch(
    searchFor: string[],
    tester: string[],
): boolean {
    let wasWildcard = false
    if (searchFor.length > tester.length) {
        return false
    }
    for (let index = 0; index < tester.length; index++) {
        const testerPart = tester[index]
        const searchForPart: string | undefined = searchFor[index] ?? undefined
        if (
            searchForPart == "*" ||
            (
                wasWildcard &&
                searchForPart == undefined
            )
        ) {
            wasWildcard = true
            continue
        }
        wasWildcard = false
        if (testerPart != searchForPart) {
            return false
        }
    }
    return true
}

export function defaultProxyErrorHandler(err: Error) {
    if (err.message == "read ECONNRESET") {
        return
    }
    const stack = err.stack?.split("\n") ?? [err.message]
    console.error({
        msg: err.message,
        name: stack.shift(),
        stack: stack
    })
}

export interface CreateResolverOptions {
    staticIndexFiles?: string[]
    proxyErrorHandler?: (err: Error) => any
    cacheMillis?: number,
    verbose?: boolean,
}

export interface CreateResolverSettings extends CreateResolverOptions {
    staticIndexFiles: string[],
    proxyErrorHandler: (err: Error) => any,
    cacheMillis: number,
    verbose: boolean,
}

export const defaultCreateResolverSettings: CreateResolverSettings = {
    staticIndexFiles: [
        "index.html",
        "index.htm",
        "index.php",
        "index.md",
        "index.txt",
        "index.json",
    ],
    proxyErrorHandler: defaultProxyErrorHandler,
    cacheMillis: 1000 * 60 * 2,
    verbose: false,
}

export function parseTargetVariables(
    reqData: RequestData,
    rule: Rule,
    targetValue: string
): string {
    rule.hostVars.forEach((v: number) => {
        targetValue = targetValue.replace(
            "{" + (-v) + "}",
            reqData.hostParts[v - 1]
        )
    })
    rule.pathVars.forEach((v: number) => {
        targetValue = targetValue.replace(
            "{" + v + "}",
            reqData.pathParts[v - 1]
        )
    })
    return targetValue
}

export function overwriteRequestUrl(
    reqData: RequestData,
    rule: Rule,
    req: IncomingMessage,
): void {
    req.url = reqData.path.substring(
        rule.path.length
    )
    if (!req.url.startsWith("/")) {
        req.url = "/" + req.url
    }
}

export function createProxy(
    settings: CreateResolverSettings,
    rule: ProxyRule,
    proxyConnections: ProxyConnectionCounter,
    proxyTargetIdMap: ProxyTargetMapper,
    proxyTargetIds: string[],
    reqData: RequestData,
    req: IncomingMessage,
): HttpProxy {
    let target: ProxyTarget
    let targetId: string
    if (rule.target.length == 1) {
        target = rule.target[0]
    } else {
        targetId = proxyTargetIds.sort(
            (a, b) => proxyConnections[a] - proxyConnections[b]
        )[0]
        target = proxyTargetIdMap[targetId]
    }
    const targetHost: string = parseTargetVariables(
        reqData,
        rule,
        target[1]
    )
    overwriteRequestUrl(
        reqData,
        rule,
        req
    )
    const proxy: HttpProxy = new HttpProxy({
        target: {
            protocol: target[0] ? "https:" : "http:",
            host: targetHost,
            port: target[2],
        },
        ws: true,
        secure: env.PROXY_VERIFY_CERTIFICATE,
        proxyTimeout: env.PROXY_REACTION_TIMEOUT,
        timeout: env.CONNECTION_TIMEOUT,
        followRedirects: env.PROXY_FOLLOW_REDIRECTS,
    })
    if (rule.target.length > 1) {
        let removed: boolean = false
        const decrease = () => {
            if (removed) {
                return
            }
            proxyConnections[targetId]--
            removed = true
        }
        proxy.on("close", decrease)
        proxy.on("error", decrease)
    }
    proxy.on("error", settings.proxyErrorHandler)
    settings.verbose && console.log("PROXY:", targetHost, "\non Host:", reqData.hostParts, "\non Path:", reqData.pathParts)
    return proxy
}

export interface ProxyConnectionCounter {
    [id: string]: number
}

export interface ProxyTargetMapper {
    [id: string]: ProxyTarget
}

export function createResolver(
    rule: Rule,
    cache: CacheHolder,
    options?: CreateResolverOptions
): Resolver {
    const settings: CreateResolverSettings = {
        ...defaultCreateResolverSettings,
        ...options
    }
    if (rule.type == "PROXY") {
        let proxyConnections: ProxyConnectionCounter
        let proxyTargetIdMap: ProxyTargetMapper
        let proxyTargetIds: string[]
        if (rule.target.length > 1) {
            proxyConnections = {}
            proxyTargetIds = rule.target.map((proxyTarget) => {
                const targetId = proxyTarget.join("/")
                proxyTargetIdMap[targetId] = proxyTarget
                proxyConnections[targetId] = 0
                return targetId
            })
            settings.verbose && console.log(
                "PROXY:",
                rule.host,
                rule.path,
                "Started in load balancer mode with " +
                proxyTargetIds.length +
                " targets!"
            )
        }
        return {
            type: "PROXY",
            rule,
            http: (reqData, req, res) => {
                const proxy = createProxy(
                    settings,
                    rule,
                    proxyConnections,
                    proxyTargetIdMap,
                    proxyTargetIds,
                    reqData,
                    req
                )
                proxy.web(req, res)
            },
            ws: (reqData, req, socket, head) => {
                const proxy = createProxy(
                    settings,
                    rule,
                    proxyConnections,
                    proxyTargetIdMap,
                    proxyTargetIds,
                    reqData,
                    req
                )
                proxy.ws(req, socket, head)
            },
        }
    } else if (rule.type == "REDIRECT") {
        let lastId: number
        if (rule.target.length > 1) {
            lastId = 0
        }
        return {
            type: "REDIRECT",
            rule,
            http: (reqData, req, res) => {
                let target: SplitedURL
                if (rule.target.length > 1) {
                    if (lastId >= rule.target.length) {
                        lastId = 0
                    }
                    target = rule.target[lastId++]
                } else {
                    target = rule.target[0]
                }

                const targetHost: string = parseTargetVariables(
                    reqData,
                    rule,
                    target[1]
                )
                const targetPath: string = parseTargetVariables(
                    reqData,
                    rule,
                    target[3]
                )

                settings.verbose && console.log(
                    "REDIRECT:",
                    rule.target[0] + "://" +
                    targetHost + ":" +
                    rule.target[2] + targetPath,
                    "\non Host:",
                    reqData.hostParts,
                    "\non Path:",
                    reqData.pathParts
                )
                res.statusCode = 301
                res.setHeader(
                    "Location",
                    rule.target[0] + "://" +
                    targetHost + ":" +
                    rule.target[2] +
                    targetPath
                )
                res.end()
            },
            ws: (reqData, req, socket, head) => {
                socket.destroy()
            }
        }
    } else if (rule.type == "STATIC") {
        return {
            type: "STATIC",
            rule,
            http: (reqData, req, res) => {
                overwriteRequestUrl(
                    reqData,
                    rule,
                    req
                )

                const uuid = "S$" + rule.target
                let staticServer: RequestHandler<any> | undefined = cache.get(uuid)
                if (!staticServer) {
                    staticServer = serveStatic(
                        rule.target,
                        {
                            index: settings.staticIndexFiles,
                        }
                    )
                    cache.set(
                        uuid,
                        staticServer,
                        settings.cacheMillis
                    )
                }

                settings.verbose && console.log("STATIC:", rule.target)
                staticServer(
                    req,
                    res,
                    () => {
                        settings.verbose && console.log("STATIC_NEXT:", rule.target)
                        res.statusCode = 404
                        res.end()
                    }
                )
            },
            ws: (data, req, socket, head) => {
                socket.destroy()
            }
        }
    } else {
        throw new Error("rule type: " + (rule as any).type)
    }
}

export const noCache = new NoCache()
export function createResolvers(
    rules: Rule[],
    cache: CacheHolder = noCache,
    options?: CreateResolverOptions,
): Resolver[] {
    return rules.map(rule => createResolver(rule, cache, options))
}

export type FoundResolver = Resolver & { req: RequestData }

export function findResolver(
    data: RequestData,
    resolvers: Resolver[],
    cache: CacheHolder = noCache,
    cacheMillis: number = 1000 * 20,
    verbose: boolean = false
): FoundResolver | undefined {
    if (cache && cache.has(data.host + "$" + data.path)) {
        return cache.get(data.host + "$" + data.path)
    }
    for (let index = 0; index < resolvers.length; index++) {
        const resolver = resolvers[index]
        if (!hostPartsMatch(resolver.rule.hostParts, data.hostParts)) {
            verbose && console.log("mismatch host:", resolver.rule.hostParts, data.hostParts)
            continue
        }
        if (!data.path.startsWith(resolver.rule.path)) {
            verbose && console.log("mismatch path:", data.path, resolver.rule.path)
            continue
        }
        if (cache) {
            cache?.set(data.host + "$" + data.path, resolver, cacheMillis)
        }
        verbose && console.log("found resolver:", resolver.rule.type + ":" + resolver.rule.host + resolver.rule.path)
        return {
            ...resolver,
            req: data
        }
    }
    verbose && console.log("no resolver found for:", data.host + data.path)
    return undefined
}



