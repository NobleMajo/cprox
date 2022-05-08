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

    DISABLE_SELF_SINGED: false as boolean,
    SELF_SINGED_DOMAIN: "example.com" as string,

    REQUEST_TIMEOUT: 1000 * 3 as number,
    CONNECTION_TIMEOUT: 1000 * 60 * 2 as number,

    PROXY_REACTION_TIMEOUT: 1000 * 3 as number,
    PROXY_VERIFY_CERTIFICATE: false as boolean,
    PROXY_FOLLOW_REDIRECTS: false as boolean,
}

export const variablesTypes: typenvy.VariablesTypes = {
    PRODUCTION: [typenvy.TC_BOOLEAN],
    VERBOSE: [typenvy.TC_BOOLEAN],
    TRUST_ALL_CERTS: [typenvy.TC_BOOLEAN],

    DNS_SERVER_ADDRESSES: [typenvy.TC_JSON_ARRAY, typenvy.TC_CSV_ARRAY],

    HTTP_PORT: [typenvy.TC_PORT, typenvy.TC_NULL],
    HTTPS_PORT: [typenvy.TC_PORT, typenvy.TC_NULL],
    BIND_ADDRESS: [typenvy.TC_STRING],

    CERT_PATH: [typenvy.TC_PATH],
    CERT_NAME: [typenvy.TC_STRING],
    KEY_NAME: [typenvy.TC_STRING],
    CA_NAME: [typenvy.TC_STRING, typenvy.TC_NULL],

    DISABLE_SELF_SINGED: [typenvy.TC_BOOLEAN],
    SELF_SINGED_DOMAIN: [typenvy.TC_STRING],

    REQUEST_TIMEOUT: [typenvy.TC_CALCULATION, typenvy.TC_NUMBER],
    CONNECTION_TIMEOUT: [typenvy.TC_CALCULATION, typenvy.TC_NUMBER],

    PROXY_REACTION_TIMEOUT: [typenvy.TC_CALCULATION, typenvy.TC_NUMBER],
    PROXY_VERIFY_CERTIFICATE: [typenvy.TC_BOOLEAN],
    PROXY_FOLLOW_REDIRECTS: [typenvy.TC_BOOLEAN],
}