import * as typenvy from "typenvy"
export const defaultEnv = {
    PRODUCTION: (process.env.NODE_ENV === "production") as boolean,
    VERBOSE: false as boolean,
    TRUST_ALL_CERTS: true as boolean,

    DNS_SERVER_ADDRESSES: [
        "127.0.0.11",
        "1.0.0.1",
        "8.8.4.4",
        "1.1.1.1",
        "8.8.8.8"
    ] as string[],


    HTTP_PORT: 80 as number | null,
    HTTPS_PORT: 443 as number | null,
    BIND_ADDRESS: "0.0.0.0" as string,

    CERT_PATH: "./certs" as string,
    CERT_NAME: "cert.pem" as string,
    KEY_NAME: "privkey.pem" as string,
    CA_NAME: "chain.pem" as string | null,

    SELF_SINGED_IF_NEEDED: true as boolean,
    SELF_SINGED_DOMAIN: "example.com" as string,
}
export const variablesTypes: typenvy.VariablesTypes = {
    PRODUCTION: [typenvy.TC_BOOLEAN],
    VERBOSE: [typenvy.TC_BOOLEAN],
    TRUST_ALL_CERTS: [typenvy.TC_BOOLEAN],
    DNS_SERVER_ADDRESSES: [typenvy.TC_ARRAY],
    HTTP_PORT: [typenvy.TC_NUMBER, typenvy.TC_NULL],
    HTTPS_PORT: [typenvy.TC_NUMBER, typenvy.TC_NULL],
    BIND_ADDRESS: [typenvy.TC_STRING],
    CERT_PATH: [typenvy.TC_PATH],
    CERT_NAME: [typenvy.TC_STRING],
    KEY_NAME: [typenvy.TC_STRING],
    CA_NAME: [typenvy.TC_STRING, typenvy.TC_NULL],
    SELF_SINGED_IF_NEEDED: [typenvy.TC_BOOLEAN],
    SELF_SINGED_DOMAIN: [typenvy.TC_STRING],
}