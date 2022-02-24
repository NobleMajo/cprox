import { parseEnv } from "typenvy"
import { defaultEnv, variablesTypes } from "./env"

export default parseEnv(defaultEnv, variablesTypes)
    .setProcessEnv().errExit().env
