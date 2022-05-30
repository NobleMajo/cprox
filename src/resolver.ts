import { IncomingMessage, ServerResponse } from "http"
import { Duplex } from "stream"
import { RequestData } from './reqdata'
import { Awaitable } from "majotools/dist/httpMiddleware"
import { RuleModule } from "./rulemodule"
import { Rule } from "./rule"

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

export abstract class Resolver {
    abstract module: RuleModule
    abstract rule: Rule
    abstract http: ResolverHttpMiddleware
    abstract ws: ResolverWsMiddleware
}