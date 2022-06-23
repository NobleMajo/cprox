import { parseEnv } from "typenvy"
import { envTypes, envDefaults } from "./env"

const result = parseEnv(
    envDefaults,
    envTypes,
)
    .setProcessEnv()
    .errExit()
const env = result.env
export default env

if (!env.PRODUCTION) {
    process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0"
}

export const envData = result.getData()
