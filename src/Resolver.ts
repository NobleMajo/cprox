import { IncomingMessage, ServerResponse } from "http"
import { Duplex } from "stream"
import { Rule } from "./rule"
import HttpProxy from "http-proxy"
import serveStatic, { RequestHandler as ServeStatic } from "serve-static"
import { readFile } from "fs"

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

export function partsMatch(
    searchFor: string[],
    tester: string[],
    allowWildcard: boolean = false,
): boolean {
    if (tester.length != searchFor.length) {
        return false
    }
    for (let index = 0; index < tester.length; index++) {
        const testerPart = tester[index]
        const searchForPart = searchFor[index]
        if (allowWildcard && searchForPart == "*") {
            continue
        }
        if (testerPart != searchForPart) {
            return false
        }
    }
    return true
}

export function createResolver(rule: Rule): Resolver {
    if (rule.type == "PROXY") {
        return {
            type: "PROXY",
            rule,
            http: (data, req, res) => {
                let targetHost = rule.target[0]
                rule.hostVars.forEach((v) => {
                    targetHost = targetHost.replace(
                        "{" + v + "}",
                        data.hostParts[v]
                    )
                })
                rule.pathVars.forEach((v) => {
                    targetHost = targetHost.replace(
                        "{" + v + "}",
                        data.pathParts[v]
                    )
                })

                req.url = data.path.substring(
                    rule.path.length
                )

                new HttpProxy({
                    target: {
                        host: targetHost,
                        port: rule.target[1],
                    }
                }).web(req, res)
            },
            ws: (data, req, socket, head) => {
                let targetHost = rule.target[0]
                rule.hostVars.forEach((v) => {
                    targetHost = targetHost.replace(
                        "{" + v + "}",
                        data.hostParts[v]
                    )
                })
                rule.pathVars.forEach((v) => {
                    targetHost = targetHost.replace(
                        "{" + v + "}",
                        data.pathParts[v]
                    )
                })

                req.url = data.path.substring(
                    rule.path.length
                )

                new HttpProxy({
                    target: {
                        host: targetHost,
                        port: rule.target[1],
                    }
                }).ws(req, socket, head)
            },
        }
    } else if (rule.type == "REDIRECT") {
        return {
            type: "REDIRECT",
            rule,
            http: (data, req, res) => {
                res.statusCode = 301
                res.setHeader("Location", rule.target[0] + "://" + rule.target[1] + ":" + rule.target[2] + rule.target[3])
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
                        index: [
                            "index.html",
                            "index.htm",
                            "index.php",
                            "index.md",
                            "index.txt",
                            "index.json",
                        ]
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

export function createResolvers(rules: Rule[]): Resolver[] {
    return rules.map(rule => createResolver(rule))
}

export interface ResolverCache {
    [key: string]: Resolver
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
    cache: ResolverCache | null = null
): Resolver | undefined {
    if (cache && cache[data.host + "$" + data.path]) {
        return cache[data.host + "$" + data.path]
    }
    for (let index = 0; index < resolvers.length; index++) {
        const resolver = resolvers[index];
        if (!partsMatch(resolver.rule.hostParts, data.hostParts, true)) {
            continue
        }
        if (!partsMatch(resolver.rule.pathParts, data.pathParts, true)) {
            continue
        }
        if (cache) {
            cache[data.host + "$" + data.path] = resolver
        }
        return resolver
    }
    return undefined
}



