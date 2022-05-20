import { parseEnv } from "typenvy"
import { envTypes, envDefaults } from "./env"

const env = parseEnv(
    envDefaults,
    envTypes,
)
    .setProcessEnv()
    .errExit()
    .env
export default env

if (!env.PRODUCTION) {
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0"
}
