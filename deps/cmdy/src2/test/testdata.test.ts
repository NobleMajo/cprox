
import {
    Config,
    TypeId
} from "../index"

export const portConfig: Config = {
    port: {
        type: TypeId.NUMBER,
        min: 1000,
        max: 60000
    }
}

export const portVerboseDnsConfig: Config = {
    httpPort: {
        type: TypeId.NUMBER,
        min: 10000,
        max: 55000
    },
    verbose: {
        type: TypeId.BOOLEAN,
    },
    dnsServers: {
        type: TypeId.ARRAY,
        values: [TypeId.STRING],
    }
}

export const portVerboseDnsHostMapConfig: Config = {
    httpPort: {
        type: TypeId.NUMBER,
        min: 12000,
        max: 63000
    },
    verbose: {
        type: TypeId.BOOLEAN,
    },
    dnsServers: {
        type: TypeId.ARRAY,
        values: [TypeId.STRING, TypeId.NUMBER, TypeId.NULL],
    },
    hostMap: {
        type: TypeId.OBJECT,
        values: [
            {
                type: TypeId.OBJECT,
                values: [TypeId.STRING],
            },
            TypeId.STRING
        ],

    }
}