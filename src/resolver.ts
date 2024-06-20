import { IncomingMessage, ServerResponse } from "http"
import { Duplex } from "stream"
import { Rule, ProxyRule, StaticRule, RedirectRule, ProxyTarget, SplitedURL, RuleType, Rules } from './rule';
import HttpProxy from "http-proxy"
import serveStatic, { RequestHandler } from "serve-static"
import { RequestData } from './reqdata';
import env from "./env/envParser"
import { Awaitable } from "majotools/dist/httpMiddleware";

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

    /**
     * @description Defines objects `rule`, `http`, and `ws` properties and sets their
     * values according to information provided in its argument list.
     * 
     * @param { ProxyRule } rule - ProxyRule object that defines the HTTP proxying rules
     * for the application.
     * 
     * @param { ResolverHttpMiddleware } http - `ResolverHttpMiddleware` instance and
     * provides access to the middleware functions for handling HTTP requests.
     * 
     * @param { ResolverWsMiddleware } ws - `ResolverWsMiddleware` component in the
     * constructor of the class.
     */
    constructor(
        public rule: ProxyRule,
        public http: ResolverHttpMiddleware,
        public ws: ResolverWsMiddleware,
    ) { }
}

export class StaticResolver implements BaseResolver {
    public type: "STATIC" = "STATIC"

    /**
     * @description Defines a class with three properties: `rule`, `http`, and `ws`.
     * 
     * @param { StaticRule } rule - StaticRule object that contains information about the
     * HTTP or WebSocket rule to which the constructor belongs.
     * 
     * @param { ResolverHttpMiddleware } http - ResolveHttp Middleware, which is responsible
     * for handling HTTP requests.
     * 
     * @param { ResolverWsMiddleware } ws - 3rd party websocket middleware to be injected
     * into the constructor.
     */
    constructor(
        public rule: StaticRule,
        public http: ResolverHttpMiddleware,
        public ws: ResolverWsMiddleware,
    ) { }
}

export class RedirectResolver implements BaseResolver {
    public type: "REDIRECT" = "REDIRECT"

    /**
     * @description Sets up middlewares for redirect and websocket requests for the application.
     * 
     * @param { RedirectRule } rule - `RedirectRule` object that is used to configure
     * redirection rules for HTTP and WebSocket requests.
     * 
     * @param { ResolverHttpMiddleware } http - ResolveHttp Middleware in the constructor
     * function.
     * 
     * @param { ResolverWsMiddleware } ws - ResolverWsMiddleware component in the constructor
     * function.
     */
    constructor(
        public rule: RedirectRule,
        public http: ResolverHttpMiddleware,
        public ws: ResolverWsMiddleware,
    ) { }
}

export type Resolver = ProxyResolver | StaticResolver | RedirectResolver
export type Resolvers = Resolver[]

/**
 * @description Checks if all elements in a given search sequence ("searchFor") match
 * their corresponding elements in another given sequence ("tester").
 * 
 * @param { string[] } searchFor - pattern to be matched in the input string.
 * 
 * @param { string[] } tester - part or parts of a string to be searched for in the
 * `searchFor` array.
 * 
 * @returns { boolean } a boolean value indicating whether the specified parts of the
 * host string match those in the search query.
 */
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

/**
 * @description Handles error responses from a proxy server and logs information about
 * the error, including the message, name, and stack trace, to the console.
 * 
 * @param { Error } err - Error object passed to the function, which is then analyzed
 * and processed based on its properties and message.
 * 
 * @returns { object } a string containing information about the error, including the
 * message and the stack trace.
 */
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

/**
 * @description Replaces placeholder variables with actual values from the `reqData`
 * object, based on the `rule` and `targetValue` input.
 * 
 * @param { RequestData } reqData - data that is passed from the main program to be
 * parsed and replaced with variables in the `targetValue`.
 * 
 * @param { Rule } rule - 3D rule to which the variable replacement is applied.
 * 
 * @param { string } targetValue - string value that is being processed by the function,
 * and it undergoes substitution with placeholders for dynamic values extracted from
 * `reqData` and `rule`.
 * 
 * @returns { string } a modified version of the input `targetValue`, with placeholders
 * replaced with values from the `reqData` object.
 */
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

/**
 * @description Modifies the URL of an incoming request based on a rule provided in
 * the `rule` parameter, and ensures that the resulting URL starts with a slash if necessary.
 * 
 * @param { RequestData } reqData - data of the request, which contains the path
 * information to be overwritten on the request URL.
 * 
 * @param { Rule } rule - portion of the request URL that should be overridden with
 * the data from the `reqData` object.
 * 
 * @param { IncomingMessage } req - IncomingMessage object passed to the function,
 * and its `url` property is modified by updating its value with the manipulated path
 * from the `rule.path` and any necessary prefixing of the URL with the leading slash
 * "/".
 */
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

/**
 * @description Creates an HTTP proxy instance based on configuration settings, rule,
 * and other inputs. It sets up the proxy target, protocol, host, port, secure, follow
 * redirects, and error handling mechanisms.
 * 
 * @param { CreateResolverSettings } settings - CreateResolverSettings object that
 * specifies the configuration for the HTTP proxy, such as verbosity level and error
 * handling mechanism.
 * 
 * @param { ProxyRule } rule - ProxyRule object defining the proxy configuration for
 * a particular target, including the host name, port number, and any specific path
 * manipulation instructions.
 * 
 * @param { ProxyConnectionCounter } proxyConnections - count of connections currently
 * being made to the upstream servers for the given target ID, which is used to
 * determine which target to use when there are multiple targets available.
 * 
 * @param { ProxyTargetMapper } proxyTargetIdMap - 1:1 mapping between the original
 * request target and its corresponding proxy target ID, which is used to identify
 * the appropriate proxy target for forwarding the request.
 * 
 * @param { string[] } proxyTargetIds - 0-based array of target IDs used to select a
 * specific target from the `rule.target` array when multiple targets are defined,
 * allowing the function to intelligently route incoming requests based on the target
 * connection with the fewest established connections.
 * 
 * @param { RequestData } reqData - data of a request that is being proxied, providing
 * information such as the hostname, port number, and path to be used in the proxy configuration.
 * 
 * @param { IncomingMessage } req - incoming message being proxied, and is used to
 * modify the URL of the request for target variable resolution and redirect handling.
 * 
 * @returns { HttpProxy } an instance of `HttpProxy` with configuration settings set
 * based on the input parameters.
 */
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
        /**
         * @description Decrements a reference counted object by removing it from a cache if
         * it is not null.
         * 
         * @returns { boolean } a boolean value indicating whether the target connection was
         * successfully removed from the list of proxy connections.
         */
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
        "PROXY:" + targetHost + "   " + target[2] + "   " + target[3] + "\n" +
        "on Host:" + reqData.hostParts + "\n" +
        "on Path:" + reqData.pathParts
    )
    return proxy
}

export interface ProxyConnectionCounter {
    [id: string]: number
}

export interface ProxyTargetMapper {
    [id: string]: ProxyTarget
}

/**
 * @description Generates a custom HTTP resolver for given rules based on their `type`.
 * It creates a new instance of a subclassed resolver depending on the rule type, and
 * sets up necessary functions to handle incoming requests.
 * 
 * @param { Rule } rule - 3D Object rule provided by the caller, which specifies the
 * HTTP request type and routing strategy for generating an HTTP response.
 * 
 * @param { CreateResolverOptions } options - CreateResolverOptions object, which
 * provides additional settings for customizing the behavior of the resolver, such
 * as setting default values for certain properties or overwriting existing settings.
 * 
 * @returns { Resolver } a Resolver object that handles incoming requests based on
 * the given rule.
 */
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
                const targetId = proxyTarget.join("/")
                proxyTargetIdMap[targetId] = proxyTarget
                proxyConnections[targetId] = 0
                return targetId
            })
            settings.verbose && console.debug(
                "PROXY:",
                rule.host,
                rule.path,
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
                    target[1]
                )
                const targetPath: string = parseTargetVariables(
                    reqData,
                    rule,
                    target[3]
                )

                settings.verbose && console.debug(
                    "REDIRECT:",
                    target[0] + "://" +
                    targetHost + ":" +
                    target[2] + targetPath,
                    "\non Host:",
                    reqData.hostParts,
                    "\non Path:",
                    reqData.pathParts
                )
                res.statusCode = 301
                res.setHeader(
                    "Location",
                    target[0] + "://" +
                    targetHost + ":" +
                    target[2] +
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

                const uuid = "S$" + rule.target
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
        throw new Error("rule type: " + (rule as any).type)
    }
}

/**
 * @description Maps over a given set of `Rules` and uses them to create new `Resolvers`.
 * It takes an optional `CreateResolverOptions` object to customize the creation process.
 * 
 * @param { Rules } rules - collection of rules to be transformed into resolvers using
 * the `createResolvers()` function.
 * 
 * @param { CreateResolverOptions } options - settings for creating resolvers based
 * on the given rules, allowing for customization of the creation process.
 * 
 * @returns { Resolvers } an array of resolution functions tailored to the provided
 * rules and options.
 */
export function createResolvers(
    rules: Rules,
    options?: CreateResolverOptions,
): Resolvers {
    return rules.map(rule => createResolver(rule, options))
}

export type FoundResolver = Resolver & { req: RequestData }

/**
 * @description Searches through a list of resolvers (provided in the `resolvers`
 * parameter) to find one that matches the given request data (`data`). If a matching
 * resolver is found, it returns the resolver's properties and the request data.
 * Otherwise, it returns `undefined`.
 * 
 * @param { RequestData } data - request data passed through the function, which is
 * used to retrieve a resolver from the cache or to check if a resolver already exists
 * for the current host and path.
 * 
 * @param { Resolvers } resolvers - an array of resolution rules that can be matched
 * to a given request, and is used to identify a potential resolver for the request.
 * 
 * @param { object } cache - {get, set} functions of a cache object that stores and
 * retrieves found resolvers for hosts and paths based on their combination.
 * 
 * @param { boolean } verbose - ability to output additional information about the
 * matching resolvers at debug levels.
 * 
 * @returns { FoundResolver | undefined } a `FoundResolver` object or `undefined`,
 * depending on whether a matching resolver was found in the cache or not.
 */
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
        const resolver: FoundResolver = cache.get(data.host + "$" + data.path) as any
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
        if (!data.path.startsWith(resolver.rule.path)) {
            verbose && console.debug("CPROX-RESOLVER: mismatch path:", data.path, resolver.rule.path)
            continue
        }
        if (cache) {
            cache.set(data.host + "$" + data.path, resolver)
        }
        verbose && console.debug("CPROX-RESOLVER: found resolver:", resolver.rule.type + ":" + resolver.rule.host + resolver.rule.path)
        return {
            ...resolver,
            req: data
        }
    }
    verbose && console.debug("CPROX-RESOLVER: no resolver found for:", data.host + + data.path)
    return undefined
}



