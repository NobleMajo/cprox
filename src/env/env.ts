import * as typenvy from "typenvy"
export const defaultEnv = {
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

    SELF_SINGED_IF_NEEDED: true as boolean,
    SELF_SINGED_DOMAIN: "example.com" as string,
}
export const variablesTypes: typenvy.VariablesTypes = {
    PRODUCTION: [typenvy.TC_BOOLEAN],
    VERBOSE: [typenvy.TC_BOOLEAN],
    DNS_SERVER_ADDRESSES: [typenvy.TC_ARRAY],
    HTTP_PORT: [typenvy.TC_NUMBER],
    HTTPS_PORT: [typenvy.TC_NUMBER],
    BIND_ADDRESS: [typenvy.TC_STRING],
    CERT_PATH: [typenvy.TC_PATH],
    KEY_PATH: [typenvy.TC_PATH],
    CA_PATH: [typenvy.TC_PATH, typenvy.TC_NULL],
    SELF_SINGED_IF_NEEDED: [typenvy.TC_BOOLEAN],
    SELF_SINGED_DOMAIN: [typenvy.TC_STRING],
}