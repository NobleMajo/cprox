import { IncomingMessage, ServerResponse } from "http"
import { Duplex } from "stream"
import { Rule } from "./rule"
import HttpProxy from "http-proxy"
import serveStatic from "serve-static"
import { CacheHolder } from "./cache"
import { createRequire } from "module"

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

export interface RequestData {
    host: string,
    path: string,
    hostParts: string[],
    pathParts: string[],
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
    if (tester.length != searchFor.length) {
        return false
    }
    for (let index = 0; index < tester.length; index++) {
        const testerPart = tester[index]
        const searchForPart = searchFor[index]
        if (searchForPart == "*") {
            continue
        }
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
}

export interface CreateResolverSettings extends CreateResolverOptions {
    staticIndexFiles: string[]
    proxyErrorHandler: (err: Error) => any
    cacheMillis: number
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
    cacheMillis: 1000 * 60 * 2
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
                const uuid = targetHost + "$" + rule.target[1]
                let proxy: HttpProxy = cache.get(uuid)
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
                const uuid = targetHost + "$" + rule.target[1]
                let proxy: HttpProxy = cache.get(uuid)
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
                req.url = data.path.substring(rule.path.slice(1).length)
                serveStatic(
                    rule.target,
                    {
                        index: settings.staticIndexFiles
                    }
                )(
                    req,
                    res,
                    () => {
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

export function createResolvers(
    rules: Rule[],
    cache: CacheHolder,
): Resolver[] {
    return rules.map(rule => createResolver(rule, cache))
}

export function getRequestData(
    host: string,
    path: string
): RequestData {
    const hostParts = host.split(".").reverse()
    const pathParts = path.split("/")
    if (pathParts[0] == "") {
        pathParts.shift()
    }
    return {
        host: host,
        path: path,
        hostParts: hostParts,
        pathParts: pathParts,
    }
}

export function findResolver(
    data: RequestData,
    resolvers: Resolver[],
    cache: CacheHolder,
    cacheMillis: number = 1000 * 20,
): Resolver | undefined {
    if (cache && cache.has(data.host + "$" + data.path)) {
        return cache.get(data.host + "$" + data.path)
    }
    for (let index = 0; index < resolvers.length; index++) {
        const resolver = resolvers[index]
        if (!hostPartsMatch(resolver.rule.hostParts, data.hostParts)) {
            console.log("mismatch host:", resolver.rule.hostParts, data.hostParts)
            continue
        }
        if (!data.path.startsWith(resolver.rule.path)) {
            console.log("mismatch path:", data.path, resolver.rule.path) 
            continue
        }
        if (cache) {
            cache?.set(data.host + "$" + data.path, resolver, cacheMillis)
        }
        return resolver
    }
    return undefined
}



