import { parseEnv } from "typenvy"
import { defaultEnv, variablesTypes } from "./env"

const env = parseEnv(defaultEnv, variablesTypes)
.setProcessEnv().errExit().env
export default env

if (!env.PRODUCTION) {
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0"
}
