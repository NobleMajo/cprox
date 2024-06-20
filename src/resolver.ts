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
     * @description Initializes an instance of a class with three public members: `rule`,
     * `http`, and `ws`. These members are likely used to handle HTTP and WebSocket
     * requests and responses.
     * 
     * @param { ProxyRule } rule - ProxyRule that determines how the functions within the
     * constructor are intercepted and modified before being executed.
     * 
     * @param { ResolverHttpMiddleware } http - `ResolveHttp Middleware` used to handle
     * HTTP requests.
     * 
     * @param { ResolverWsMiddleware } ws - ResolverWsMiddleware for handling WebSocket
     * connections in the constructor of the class.
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
     * @description Defines the dependencies for a class, which can then be used to
     * initialize and configure objects.
     * 
     * @param { StaticRule } rule - StaticRule object that contains configuration data
     * for HTTP and WebSocket middleware.
     * 
     * @param { ResolverHttpMiddleware } http - `ResolveHttpMiddleware` interface, which
     * is responsible for handling HTTP requests and responses.
     * 
     * @param { ResolverWsMiddleware } ws - `ResolveWsMiddleware` service that is injected
     * into the constructor of the class.
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
     * @description Sets properties for a class instance that includes an `RedirectRule`,
     * `ResolverHttpMiddleware`, and `ResolverWsMiddleware`.
     * 
     * @param { RedirectRule } rule - `RedirectRule` object that determines how to handle
     * incoming requests.
     * 
     * @param { ResolverHttpMiddleware } http - ResolverHttpMiddleware used to handle
     * HTTP requests.
     * 
     * @param { ResolverWsMiddleware } ws - ResolverWsMiddleware, which handles websocket
     * connections in the application.
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
 * @description Compares two arrays of strings, `searchFor` and `tester`, and returns
 * `true` if all elements in `searchFor` are present in `tester`, and `false` otherwise.
 * 
 * @param { string[] } searchFor - string to search for within the `tester` string.
 * 
 * @param { string[] } tester - sequence of parts to compare with the `searchFor`
 * parameter, and is used to determine if any part of the `searchFor` sequence matches
 * any part of the `tester` sequence.
 * 
 * @returns { boolean } a boolean indicating whether the searchFor pattern matches
 * the tester.
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
 * @description Handles and logs proxy errors based on error message and stack trace
 * information provided.
 * 
 * @param { Error } err - error object passed to the function.
 * 
 * @returns { object } a message indicating the error occurred, along with information
 * about the error's cause and any relevant stack trace.
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
 * @description Replaces placeholders in a string with values from a `RequestData`
 * object and a set of host and path variables.
 * 
 * @param { RequestData } reqData - data provided by the user in a request, which is
 * used to replace placeholders in the `targetValue`.
 * 
 * @param { Rule } rule - rule that is being processed, and its hostVars and pathVars
 * properties are iterated over to replace placeholders in the target value with
 * actual values from the request data.
 * 
 * @param { string } targetValue - value to be transformed by replacing placeholder
 * tokens with actual values extracted from the `reqData`.
 * 
 * @returns { string } a modified version of the `targetValue`, with any occurrences
 * of `{{ }}` replaced with values from `reqData`.
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
 * @description Modifies the URL of an incoming message based on a rule and user-provided
 * data, appending or prefixing the URL with `/`.
 * 
 * @param { RequestData } reqData - request data containing the path information,
 * which is utilized to generate the modified URL.
 * 
 * @param { Rule } rule - part of the original URL that should be replaced with the
 * new path.
 * 
 * @param { IncomingMessage } req - incoming HTTP request message, which is modified
 * by the function to overwrite its URL based on the provided rule and data.
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
 * @description Creates an HTTP proxy based on given settings, rules, and data. It
 * sets up a target host and port, secure connection (if enabled), timeouts, and
 * follow redirects. The function also handles proxy errors and logs verbose messages.
 * 
 * @param { CreateResolverSettings } settings - CreateResolverSettings object, which
 * defines configuration options for the HTTP proxy such as verification of certificate
 * authenticity and reaction timeout.
 * 
 * @param { ProxyRule } rule - configuration of a specific proxy rule to be applied
 * to the incoming request, including the target host and port, and any additional
 * configuration options such as verify certificate and timeout values.
 * 
 * @param { ProxyConnectionCounter } proxyConnections - count of active connections
 * for each target ID, which is used to remove one connection when a new one is
 * established through the proxy.
 * 
 * @param { ProxyTargetMapper } proxyTargetIdMap - 1-to-many mapping between the
 * original request's target URL and a unique identifier for each target, allowing
 * the proxy to target the correct destination based on the rule.
 * 
 * @param { string[] } proxyTargetIds - 0-based array of unique target IDs generated
 * by sorting and selecting the corresponding ProxyConnectionCounter value for each
 * target, which is used to determine the target proxy to use based on the rule provided.
 * 
 * @param { RequestData } reqData - data needed to create a HTTP request, including
 * the URL, headers, and any other relevant information, which is then used to customize
 * the created HTTP proxy.
 * 
 * @param { IncomingMessage } req - incoming message that triggered the creation of
 * the proxy, and it is passed through to the created proxy for further processing.
 * 
 * @returns { HttpProxy } an instance of the `HttpProxy` class, representing a HTTP(S)
 * proxy with customized target configuration and event listeners.
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
         * @description Decreases the value of `proxyConnections` for a specific `targetId`.
         * If the target is already removed, the function returns immediately without modifying
         * the array.
         * 
         * @returns { undefined } the updated value of `removed`.
         * 
         * 	* `removed`: A boolean value indicating whether the connection was successfully
         * removed. If `true`, the connection was removed; otherwise, it remains unchanged.
         * 	* `proxyConnections[targetId]`: The value of this property decreases by 1 whenever
         * the function is called, indicating the number of active connections for the specified
         * target ID.
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
        "PROXY: " + targetHost + ":" + target[2] + "\n" +
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
 * @description Creates a Resolver instance based on given Rule object and options,
 * which can handle PROXY, REDIRECT, or STATIC requests. It returns a Resolver instance
 * with the appropriate handler for the given request type.
 * 
 * @param { Rule } rule - λ rule to create a resolver for.
 * 
 * @param { CreateResolverOptions } options - CreateResolverOptions object, which
 * allows for additional customization of the created resolver.
 * 
 * @returns { Resolver } an instance of a `Resolver` object that can handle HTTP
 * requests based on a given rule.
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
 * @description Maps a set of `Rules` objects to corresponding `Resolvers`. Each rule
 * is passed through the `createResolver` function with any provided `CreateResolverOptions`,
 * and the resulting resolver is returned as part of the map result.
 * 
 * @param { Rules } rules - set of rules that determine how to convert code into
 * documentation, which are then mapped and returned as a collection of Resolvers.
 * 
 * @param { CreateResolverOptions } options - configuration object used to customize
 * the creation of resolvers for each rule in the `rules` array.
 * 
 * @returns { Resolvers } an array of resolvers created for each rule provided in the
 * `rules` parameter.
 */
export function createResolvers(
    rules: Rules,
    options?: CreateResolverOptions,
): Resolvers {
    return rules.map(rule => createResolver(rule, options))
}

export type FoundResolver = Resolver & { req: RequestData }

/**
 * @description Searches through a list of provided resolvers based on the given
 * request's host and path, returning the first matching resolver or `undefined`. It
 * uses a cache to store previously found resolvers for efficient lookups.
 * 
 * @param { RequestData } data - request data passed through the function, which is
 * used to determine if a resolver is found for the provided host and path.
 * 
 * @param { Resolvers } resolvers - an array of Resolver objects that are searched
 * to find a matching one for a given request data, with each Resolver object
 * representing a potential URL pattern and associated handler.
 * 
 * @param { object } cache - {get, set} object that stores already resolved resolvers
 * for specific host and path combinations, allowing quick lookups instead of
 * reresolution when called with a new request.
 * 
 * @param { boolean } verbose - logging level, when set to `true`, it enables debug
 * logs for the resolution process, otherwise, only essential information is logged.
 * 
 * @returns { FoundResolver | undefined } a `FoundResolver` object containing the
 * resolved data or `undefined` if no resolver was found.
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



