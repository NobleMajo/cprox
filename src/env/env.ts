export default {
    PRODUCTION: (process.env.NODE_ENV === "production") as boolean,

    PORT: 8080 as number,
    BIND_ADDRESS: "0.0.0.0" as string,
    TRUSTED_PROXYS: [
        "127.0.0.1"
    ] as string[],

    VERBOSE: false as boolean,

    ORIGIN_HOST: undefined as any as string,

    CONTAINER_NAME_PREFIX: "codec_" as string,
    CONTAINER_NAME_SUFFIX: "" as string,
    CONTAINER_PORT: 8080 as number,
}
