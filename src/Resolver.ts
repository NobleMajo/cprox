import { IncomingMessage, ServerResponse } from "http"
import { Duplex } from "stream"
import { Rule } from "./rule"
import HttpProxy from "http-proxy"
import serveStatic, { RequestHandler as ServeStatic } from "serve-static"

export interface BaseResolver {
    type: "PROXY" | "STATIC" | "REDIRECT",
    rule: Rule,
    http: (
        req: IncomingMessage,
        res: ServerResponse
    ) => Promise<void> | void,
    ws: (
        req: IncomingMessage,
        socket: Duplex,
        head: Buffer
    ) => Promise<void> | void
}

export interface ProxyResolver extends BaseResolver {
    type: "PROXY",
    proxy: HttpProxy
}

export interface StaticResolver extends BaseResolver {
    type: "STATIC",
    serve: ServeStatic<any>
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
        const proxy = new HttpProxy({
            target: {
                host: rule.target[0],
                port: rule.target[1],
            }
        })
        return {
            type: "PROXY",
            rule,
            proxy,
            http: (req, res) => proxy.web(req, res),
            ws: (req, socket, head) => proxy.ws(req, socket, head),
        }
    } else if (rule.type == "REDIRECT") {
        return {
            type: "REDIRECT",
            rule,
            http: (req, res) => {
                res.statusCode = 301
                res.setHeader("Location", rule.target[0] + rule.target[1] + rule.target[2] + rule.target[3])
                res.end()
            },
            ws: (req, socket) => {
                socket.destroy()
            }
        }
    } else if (rule.type == "STATIC") {
        const staticServer = serveStatic(rule.target)
        return {
            type: "STATIC",
            rule,
            serve: staticServer,
            http: (
                req,
                res
            ) => {
                if (!req.url) {
                    req.url = rule.target
                }
                req.url = req.url.substring(rule.target.length)
                staticServer(req, res, () => {
                    res.statusCode = 404
                    res.end()
                })
            },
            ws: (req, socket) => {
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

export function findResolver(
    host: string,
    path: string,
    resolvers: Resolver[],
    cache: ResolverCache | null = null
): Resolver | undefined {
    if (cache && cache[host + "$" + path]) {
        return cache[host + "$" + path]
    }
    const hostParts = host.split(".").reverse()
    const pathParts = path.split("/")
    if (pathParts[0] == "") {
        pathParts.shift()
    }
    for (let index = 0; index < resolvers.length; index++) {
        const resolver = resolvers[index];
        if (!partsMatch(resolver.rule.hostParts, hostParts, true)) {
            continue
        }
        if (!partsMatch(resolver.rule.pathParts, pathParts, true)) {
            continue
        }
        if (cache) {
            cache[host + "$" + path] = resolver
        }
        return resolver
    }
    return undefined
}



