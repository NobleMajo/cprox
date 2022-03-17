import { IncomingMessage, ServerResponse } from "http"
import { Duplex } from "stream"
import { Rule } from "./rule"
import HttpProxy from "http-proxy"
import serveStatic, { RequestHandler } from "serve-static"
import { CacheHolder, NoCache } from "./cache"
import { RequestData } from './reqdata';

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
}

export interface StaticResolver extends BaseResolver {
    type: "STATIC",
}

export interface RedirecResolver extends BaseResolver {
    type: "REDIRECT",
}

export type Resolver = ProxyResolver | StaticResolver | RedirecResolver

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

export function createResolver(
    rule: Rule,
    cache: CacheHolder,
    options?: CreateResolverOptions
): Resolver {
    const settings = {
        ...defaultCreateResolverSettings,
        ...options
    }
    if (rule.type == "PROXY") {
        return {
            type: "PROXY",
            rule,
            http: (data, req, res) => {
                let targetHost = rule.target[0]
                rule.hostVars.forEach((v: number) => {
                    targetHost = targetHost.replace(
                        "{" + (-v) + "}",
                        data.hostParts[v - 1]
                    )
                })
                rule.pathVars.forEach((v: number) => {
                    targetHost = targetHost.replace(
                        "{" + v + "}",
                        data.pathParts[v - 1]
                    )
                })
                req.url = data.path.substring(
                    rule.path.length
                )
                if (!req.url.startsWith("/")) {
                    req.url = "/" + req.url
                }
                const uuid = "P$" + targetHost + "$" + rule.target[1]
                let proxy: HttpProxy | undefined = cache.get(uuid)
                if (!proxy) {
                    proxy = new HttpProxy({
                        target: {
                            host: targetHost,
                            port: rule.target[1],
                        }
                    })
                    proxy.on("error", settings.proxyErrorHandler)
                    cache.set(
                        uuid,
                        proxy,
                        settings.cacheMillis,
                        (value) => value.close()
                    )
                }
                settings.verbose && console.log("PROXY_WEB:", targetHost, "\non Host:", data.hostParts, "\non Path:", data.pathParts)
                proxy.web(req, res)
            },
            ws: (data, req, socket, head) => {
                let targetHost = rule.target[0]
                rule.hostVars.forEach((v: number) => {
                    targetHost = targetHost.replace(
                        "{" + (-v) + "}",
                        data.hostParts[v - 1]
                    )
                })
                rule.pathVars.forEach((v: number) => {
                    targetHost = targetHost.replace(
                        "{" + v + "}",
                        data.pathParts[v - 1]
                    )
                })
                req.url = data.path.substring(
                    rule.path.length
                )
                if (!req.url.startsWith("/")) {
                    req.url = "/" + req.url
                }
                const uuid = "P$" + targetHost + "$" + rule.target[1]
                let proxy: HttpProxy | undefined = cache.get(uuid)
                if (!proxy) {
                    proxy = new HttpProxy({
                        target: {
                            host: targetHost,
                            port: rule.target[1],
                        },
                    })
                    proxy.on("error", settings.proxyErrorHandler)
                    cache.set(
                        uuid,
                        proxy,
                        settings.cacheMillis,
                        (value) => value.close()
                    )
                }
                settings.verbose && console.log("PROXY_WS:", targetHost, "\non Host:", data.hostParts, "\non Path:", data.pathParts)
                proxy.ws(req, socket, head)
            },
        }
    } else if (rule.type == "REDIRECT") {
        return {
            type: "REDIRECT",
            rule,
            http: (data, req, res) => {
                let targetHost = rule.target[1]
                let targetPath = rule.target[3]

                rule.hostVars.forEach((v: number) => {
                    targetHost = targetHost.replace(
                        "{" + (-v) + "}",
                        data.hostParts[v - 1]
                    )
                })
                rule.pathVars.forEach((v: number) => {
                    targetHost = targetHost.replace(
                        "{" + v + "}",
                        data.pathParts[v - 1]
                    )
                })

                rule.hostVars.forEach((v: number) => {
                    targetPath = targetPath.replace(
                        "{" + (-v) + "}",
                        data.hostParts[v - 1]
                    )
                })
                rule.pathVars.forEach((v: number) => {
                    targetPath = targetPath.replace(
                        "{" + v + "}",
                        data.pathParts[v - 1]
                    )
                })

                settings.verbose && console.log("REDIRECT_WEB:", rule.target[0] + "://" + targetHost + ":" + rule.target[2] + targetPath, "\non Host:", data.hostParts, "\non Path:", data.pathParts)
                res.statusCode = 301
                res.setHeader("Location", rule.target[0] + "://" + targetHost + ":" + rule.target[2] + targetPath)
                res.end()
            },
            ws: (data, req, socket, head) => {
                socket.destroy()
            }
        }
    } else if (rule.type == "STATIC") {
        return {
            type: "STATIC",
            rule,
            http: (data, req, res) => {
                req.url = data.path.substring(
                    rule.path.length
                )
                if (!req.url.startsWith("/")) {
                    req.url = "/" + req.url
                }

                const uuid = "S$" + rule.target
                let staticServer: RequestHandler<any> | undefined = cache.get(uuid)
                if (!staticServer) {
                    staticServer = serveStatic(
                        rule.target,
                        {
                            index: settings.staticIndexFiles
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



