import env from "./env/envParser"

// import express request, response, next
import { Request, Response, NextFunction, RequestHandler } from 'express'

// import express-http-proxy as proxy
import expressHttpProxy from 'express-http-proxy'

// export default function createUrlProxyMiddleware(proxySettings: ProxySettings): express.RequestHandler
export default function createContainerProxyMiddleware(
    originHost: string = env.ORIGIN_HOST_PREFIX,
    containerNamePrefix: string = env.CONTAINER_NAME_PREFIX ?? "",
    containerNameSuffix: string = env.CONTAINER_NAME_SUFFIX ?? "",
    containerPort: number = env.CONTAINER_PORT ?? 8080,
): RequestHandler {
    const expressProxyMiddlewares: {
        [domain: string]: RequestHandler
    } = {}

    // return function urlProxyMiddleware(req: Request, res: Response, next: NextFunction): void
    return function containerProxyMiddleware(req: Request, res: Response, next: NextFunction): void {
        // get request hostname by headers host
        let hostname = req.headers.host
        env.VERBOSE && console.log(" - VERBOSE: request from host: " + hostname)
        // thorw error if hostname is not defined
        if (!hostname) {
            throw new Error("No hostname ('host') defined in headers!")
        }
        if (hostname?.includes(":")) {
            hostname = hostname.split(":")[0]
        }
        if (
            hostname.length <= originHost.length ||
            !hostname.endsWith(originHost)
        ) {
            throw new Error("Origin host needs to be a subdomain of '" + originHost + "'!")
        }
        hostname = hostname.slice(0, -(originHost.length + 1)).toLowerCase()
        if (hostname.length === 0) {
            throw new Error("Origin host subdomain '" + originHost + "' needs to be greater than 0!")
        }
        env.VERBOSE && console.log(
            " - VERBOSE: result container address:\n" +
            "   http://" + containerNamePrefix + hostname + containerNameSuffix + ":" + containerPort
        )

        // cache proxy middleware in expressProxyMiddlewares
        if (!expressProxyMiddlewares[hostname]) {
            expressProxyMiddlewares[hostname] = expressHttpProxy(
                "http://" + containerNamePrefix + hostname + containerNameSuffix + ":" + containerPort,
                {
                    https: false,
                }
            )
        }

        env.VERBOSE && console.log(
            " - VERBOSE:\n" +
            "   url:\n" +
            "      " + req.url +
            "   headers:\n" +
            "      " +
            JSON.stringify(req.headers, null, 2)
                .split("\n")
                .map((v) => "      " + v)
                .join("\n")
        )

        // proxy request to cached proxy of the host
        expressProxyMiddlewares[hostname](req, res, next)
    }
}