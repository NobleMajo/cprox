import { EnvType, VariablesTypes } from "typenvy"
export const defaultEnv: EnvType = {
    PRODUCTION: (process.env.NODE_ENV === "production") as boolean,
    VERBOSE: false as boolean,

    DNS_SERVER_ADDRESSES: [
        "127.0.0.11",
        "1.0.0.1",
        "8.8.4.4",
        "1.1.1.1",
        "8.8.8.8"
    ] as string[],
    HTTP_PORT: 80 as number,
    HTTPS_PORT: 443 as number,
    BIND_ADDRESS: "0.0.0.0" as string,

    CERT_PATH: "./certs/cert.pem" as string,
    KEY_PATH: "./certs/privkey.pem" as string,
    CA_PATH: "./certs/chain.pem" as string,

    IGNORE_EMPTY_CERT: true as boolean,

    STATIC_PATH: "./public" as string,
}
/*
envParser.define("PRODUCTION", "boolean")
envParser.define("VERBOSE", "boolean")

envParser.define("DNS_SERVER_ADDRESSES", "array")
envParser.define("HTTP_PORT", "number")
envParser.define("HTTPS_PORT", "number")
envParser.define("BIND_ADDRESS", "string")

envParser.define("CERT_PATH", "string")
envParser.define("KEY_PATH", "string")
envParser.define("CA_PATH", "string")
envParser.define("IGNORE_EMPTY_CERT", "boolean")

envParser.define("STATIC_PATH", "string")
*/
export const variablesTypes: VariablesTypes = {

}