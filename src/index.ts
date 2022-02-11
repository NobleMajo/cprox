// import express, compression, cors, morgan
import express from 'express'
import compression from 'compression'
import cors from 'cors'
import morgan from 'morgan'
import dns from "dns"
import env from "./env/envParser"

dns.setServers([
    "127.0.0.11",
    "1.1.1.1",
    "8.8.8.8",
    "1.0.0.1",
    "8.8.4.4"
])

// import ErrorHandler from './middlewares/errorHandler'
import createErrorHandler from './ErrorHandlerMiddleware'
import createContainerProxyMiddleware from './ContainerProxyMiddleware'

// load proxy settings
console.log(`CProx is starting...`)

// create express app
const app = express()

// disable etag
app.set('etag', false)

// trust cloudflare ip ranges
/*
app.set('trust proxy', (ip: string) => {
    env.VERBOSE && console.log(" - VERBOSE: trust proxy check: " + ip + ".\nTrusted:", env.TRUSTED_PROXYS)
    return env.TRUSTED_PROXYS.includes(ip)
})
*/
/*
app.get(
    [
        "/health-check",
        "/live",
        "/ready",
        "/status"
    ],
    (req, res) => res.sendStatus(200)
)
*/
// use ErrorHandler middleware
// app.use(createErrorHandler())

// app use compression, cors and morgan as middlewares
// app.use(compression())
app.use(cors())
// env.PRODUCTION && app.use(morgan('dev'))

app.use(createContainerProxyMiddleware())

// start server on environment port or 3000
app.listen(
    env.PORT,
    () => {
        console.log(`CProx started on port ${env.PORT}!`)
    }
)


