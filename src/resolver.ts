import { IncomingMessage, ServerResponse } from "http";
import * as HttpProxy from "http-proxy";
import { Awaitable } from "majotools/dist/httpMiddleware";
import * as serveStatic from "serve-static";
import { RequestHandler } from "serve-static";
import { Duplex } from "stream";
import env from "./env/envParser";
import { RequestData } from './reqdata';
import { ProxyRule, ProxyTarget, RedirectRule, Rule, RuleType, Rules, SplitedURL, StaticRule, getProxyTargetId } from './rule';

export type ResolverHttpMiddleware = (
    data: RequestData,
    req: IncomingMessage,
    res: ServerResponse,
) => Awaitable<void>

export type ResolverWsMiddleware = (
    data: RequestData,
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer,
) => Awaitable<void>

export interface BaseResolver {
    type: RuleType,
    rule: Rule,
    http: ResolverHttpMiddleware,
    ws: ResolverWsMiddleware,
}

export class ProxyResolver implements BaseResolver {
    public type: "PROXY" = "PROXY"

    constructor(
        public rule: ProxyRule,
        public http: ResolverHttpMiddleware,
        public ws: ResolverWsMiddleware,
    ) { }
}

export class StaticResolver implements BaseResolver {
    public type: "STATIC" = "STATIC"

    constructor(
        public rule: StaticRule,
        public http: ResolverHttpMiddleware,
        public ws: ResolverWsMiddleware,
    ) { }
}

export class RedirectResolver implements BaseResolver {
    public type: "REDIRECT" = "REDIRECT"

    constructor(
        public rule: RedirectRule,
        public http: ResolverHttpMiddleware,
        public ws: ResolverWsMiddleware,
    ) { }
}

export type Resolver = ProxyResolver | StaticResolver | RedirectResolver
export type Resolvers = Resolver[]

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
    req.url = reqData.originPath.substring(
        rule.originPath.length
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
        target.host
    )
    overwriteRequestUrl(
        reqData,
        rule,
        req
    )

    if (
        !req.headers["X-Forwarded-Local-Address"] &&
        req.socket.localAddress
    ) {
        req.headers["X-Forwarded-Local-Address"] = "" + req.socket.localAddress
    }
    if (
        !req.headers["X-Forwarded-Local-Port"] &&
        req.socket.localPort
    ) {
        req.headers["X-Forwarded-Local-Port"] = "" + req.socket.localPort
    }
    if (
        !req.headers["X-Forwarded-For"] &&
        req.socket.remoteAddress
    ) {
        req.headers["X-Forwarded-For"] =
            "" + req.socket.remoteAddress
    }
    if (
        !req.headers["X-Forwarded-Port"] &&
        req.socket.remotePort
    ) {
        req.headers["X-Forwarded-Port"] = "" + req.socket.remotePort
    }
    if (
        !req.headers["X-Forwarded-Origin"] &&
        req.headers["origin"]
    ) {
        req.headers["X-Forwarded-Origin"] = "" + req.headers["origin"]
    }
    if (
        !req.headers["X-Forwarded-Host"] &&
        req.headers["host"]
    ) {
        req.headers["X-Forwarded-Host"] = "" + req.headers["host"]
    }
    if (!req.headers["X-Forwarded-Ssl"]) {
        req.headers["X-Forwarded-Ssl"] =
            typeof (req.socket as any).getPeerCertificate == "function" ?
                "on" :
                "off"
    }

    const proxy: HttpProxy = new HttpProxy({
        target: {
            protocol: target.secure ? "https:" : "http:",
            host: targetHost,
            port: target.port,
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
    settings.verbose && console.debug(
        "PROXY RESOLVER:" + rule.type + "\n",
        "  req from: " + reqData.hostParts.reverse().join(".") + "/" + reqData.pathParts.join("/") + "\n",
        "  resolver: " + "\n",

    )
    settings.verbose && console.debug(
        "PROXY:",
        "\nFROM HOST:", reqData.hostParts,
        "\nFROM PATH:", reqData.pathParts,
        "\nTARGET:",
        (target[0] ? "https:" : "http:") + "//" + targetHost + ":" + target[2],
    )
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
    options?: CreateResolverOptions,
): Resolver {
    const settings: CreateResolverSettings = {
        ...defaultCreateResolverSettings,
        ...options,
    }

    if (rule.type == "PROXY") {
        let proxyConnections: ProxyConnectionCounter
        let proxyTargetIdMap: ProxyTargetMapper
        let proxyTargetIds: string[]
        if (rule.target.length > 1) {
            proxyConnections = {}
            proxyTargetIdMap = {}
            proxyTargetIds = rule.target.map((proxyTarget) => {
                const targetId = getProxyTargetId(proxyTarget)
                proxyTargetIdMap[targetId] = proxyTarget
                proxyConnections[targetId] = 0
                return targetId
            })
            settings.verbose && console.debug(
                "PROXY:",
                rule.originHost,
                rule.originPath,
                "Started in load balancer mode with " +
                proxyTargetIds.length +
                " targets!"
            )
        }
        return new ProxyResolver(
            rule,
            (reqData, req, res) => {
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
            (reqData, req, socket, head) => {
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
        )
    } else if (rule.type == "REDIRECT") {
        let lastId: number
        if (rule.target.length > 1) {
            lastId = 0
        }
        return new RedirectResolver(
            rule,
            (reqData, req, res) => {
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
                    target.host,
                )
                const targetPath: string = parseTargetVariables(
                    reqData,
                    rule,
                    target.path,
                )

                settings.verbose && console.debug(
                    "REDIRECT:",
                    target.protocol + "://" +
                    targetHost + ":" +
                    target.port + targetPath,
                    "\non Host:",
                    reqData.hostParts,
                    "\non Path:",
                    reqData.pathParts
                )
                res.statusCode = 301

                res.setHeader(
                    "Location",
                    target.protocol + "://" +
                    targetHost + ":" +
                    target.port +
                    targetPath
                )
                res.end()
            },
            (reqData, req, socket, head) => {
                socket.destroy()
            },
        )
    } else if (rule.type == "STATIC") {
        return new StaticResolver(
            rule,
            (reqData, req, res) => {
                overwriteRequestUrl(
                    reqData,
                    rule,
                    req
                )

                let staticServer: RequestHandler<any> = serveStatic(
                    rule.target,
                    {
                        index: settings.staticIndexFiles,
                    }
                )

                settings.verbose && console.debug("STATIC:", rule.target)
                staticServer(
                    req,
                    res,
                    () => {
                        settings.verbose && console.debug("STATIC_NEXT:", rule.target)
                        res.statusCode = 404
                        res.end()
                    }
                )
            },
            (data, req, socket, head) => {
                socket.destroy()
            },
        )
    } else {
        throw new Error("Unknown resolver rule type: " + (rule as any).type)
    }
}

export function createResolvers(
    rules: Rules,
    options?: CreateResolverOptions,
): Resolvers {
    return rules.map(rule => createResolver(rule, options))
}

export type FoundResolver = Resolver & { req: RequestData }

export function findResolver(
    data: RequestData,
    resolvers: Resolvers,
    cache?: {
        get: (id: string) => Resolver | undefined,
        set: (id: string, value: Resolver) => void,
    },
    verbose: boolean = false,
): FoundResolver | undefined {
    if (cache) {
        const resolver: FoundResolver = cache.get(data.originHost + "$" + data.originPath) as any
        if (resolver) {
            resolver.req = data
            return resolver
        }
    }
    for (let index = 0; index < resolvers.length; index++) {
        const resolver = resolvers[index]
        if (!hostPartsMatch(resolver.rule.hostParts, data.hostParts)) {
            verbose && console.debug("CPROX-RESOLVER: mismatch host:", resolver.rule.hostParts, data.hostParts)
            continue
        }
        if (!data.originPath.startsWith(resolver.rule.originPath)) {
            verbose && console.debug("CPROX-RESOLVER: mismatch path:", data.originPath, resolver.rule.originPath)
            continue
        }
        if (cache) {
            cache.set(data.originHost + "$" + data.originPath, resolver)
        }
        verbose && console.debug("CPROX-RESOLVER: found resolver:", resolver.rule.type + ":" + resolver.rule.originHost + resolver.rule.originPath)
        return {
            ...resolver,
            req: data
        }
    }
    verbose && console.debug("CPROX-RESOLVER: no resolver found for:", data.originHost + data.originPath)
    return undefined
}



