
import { EnvironmentParser } from "typenvy"
import defaultEnv from "./env"

export const envParser = new EnvironmentParser({
    saveProcessEnv: true
})

envParser.define("PRODUCTION", "boolean")
envParser.define("VERBOSE", "boolean")

envParser.define("PORT", "number")
envParser.define("BIND_ADDRESS", "string")
envParser.define("TRUSTED_PROXYS", "array")

envParser.require("ORIGIN_HOST_PREFIX", "string")

envParser.define("CONTAINER_NAME_PREFIX", "string")
envParser.define("CONTAINER_NAME_SUFFIX", "string")
envParser.define("CONTAINER_PORT", "number")

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
