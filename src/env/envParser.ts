
import { EnvironmentParser } from "typenvy"
import defaultEnv from "./env"

export const envParser = new EnvironmentParser({
    saveProcessEnv: true
})

envParser.define("PRODUCTION", "boolean")
envParser.define("VERBOSE", "boolean")

envParser.define("DNS_SERVER_ADDRESSES", "array")
envParser.define("HTTP_PORT", "number")
envParser.define("HTTPS_PORT", "number")
envParser.define("BIND_ADDRESS", "string")
envParser.require("ORIGIN_HOST", "string")

envParser.define("CERT_PATH", "string")
envParser.define("KEY_PATH", "string")
envParser.define("CA_PATH", "string")
envParser.define("IGNORE_EMPTY_CERT", "boolean")

envParser.define("STATIC_PATH", "string")

export const env = envParser.parseEnv(defaultEnv)
if (env.exe) {
    env.exe()
}
if (!env.env) {
    throw new Error("Can't load environment!")
}
const rawEnv = env.env
process.env = {
    ...process.env,
    ...rawEnv as any
}
if (!rawEnv.PRODUCTION) {
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0"
}
export default rawEnv
