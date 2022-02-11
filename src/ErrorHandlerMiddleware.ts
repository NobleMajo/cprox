// import express request, response, next, requestHandler
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express'

// import HttpStatus and getHttpStatus from "./HttpStatus"
import { HttpStatus, getHttpStatus } from './HttpStatus'

// export class HttpError with status code
export class HttpError extends Error implements HttpStatus {
    code: number
    message: string
    description: string
    meta: string | null

    constructor(statusCode: number, message?: string) {
        super()
        const httpStatus = getHttpStatus(statusCode)
        this.code = httpStatus.code
        this.message = message || httpStatus.message
        this.description = httpStatus.description
        this.meta = httpStatus.meta
    }
}

// export default function to create ErrorHandlerMiddleware
export default function createHttpErrorHandlerMiddleware(): ErrorRequestHandler {
    return (
        err: Error | any,
        req: Request,
        res: Response,
        next: NextFunction
    ): void => {
        if (err instanceof HttpError) {
            res.status(err.code).send(err.message)
            return
        }
        console.log("Unknown error occured: ", err)
        res.status(500).send('Internal Server Error')
    }
}
