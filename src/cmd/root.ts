import { BoolFlag, CmdDefinition, ValueFlag } from "cmdy";
import * as dns from "dns";
import { cmdyFlag } from "typenvy";
import { CProX } from "../cprox";
import env, { envData } from "../env/envParser";
import { createResolvers } from "../resolver";
import { loadRawRules, parseRules, sortRules } from "../rule";
import { CertLoader, createCertLoader } from './../certs';
import version from "./version";

export const dryRun: BoolFlag = cmdyFlag(
    {
        name: "dry-run",
        alias: ["dryrun", "drun", "dryr"],
        description: "Exit cprox before final start server step.",
    },
    "DRYRUN",
    envData
)

export const rules: ValueFlag = {
    name: "rule",
    alias: ["rul"],
    shorthand: "r",
    types: ["string"],
    multiValues: true,
    description: "CProX rules",
}

export const httpPort: ValueFlag = cmdyFlag(
    {
        name: "http-port",
        alias: ["http"],
        shorthand: "p",
        types: ["number"],
        description: "Set the http port (default: 80 but disabled if any port is set)",
    }
    ,
    "HTTP_PORT",
    envData
)

export const httpsPort: ValueFlag = cmdyFlag(
    {
        name: "https-port",
        alias: ["https"],
        shorthand: "s",
        types: ["number"],
        description: "Set the https port (default: 443 but disabled if any port is set)",
    },
    "HTTPS_PORT",
    envData
)

export const trustAllCerts: BoolFlag = cmdyFlag(
    {
        name: "trust-all-certs",
        alias: ["t-a-c", "tac"],
        shorthand: "t",
        description: "Trust all certificates on proxy",
    },
    "TRUST_ALL_CERTS",
    envData
)

export const disableSelfSinged: BoolFlag = cmdyFlag(
    {
        name: "disable-self-singed",
        alias: ["disableselfsinged", "ssld"],
        description: "Disable generating self singed certificates if not exist",
    },
    "DISABLE_SELF_SINGED",
    envData
)

export const selfSingedCountryCode: ValueFlag = cmdyFlag(
    {
        name: "self-singed-country-code",
        alias: ["ssl-country-code", "sslcc"],
        types: ["string"],
        description: "Set the country code for the self singed certificate",
    },
    "SELF_SINGED_COUNTRY_CODE",
    envData
)

export const selfSingedCommonDomainName: ValueFlag = cmdyFlag(
    {
        name: "self-singed-common-domain-name",
        alias: [
            "self-singed-domain-name", "self-singed-common-name",
            "ssl-common-name", "ssl-domain-name", "ssl-common-domain-name",
            "sslcdn", "sslcn", "ssldn"
        ],
        types: ["string"],
        description: "Set the common domain name for the self singed certificate",
    },
    "SELF_SINGED_COMMON_DOMAIN_NAME",
    envData
)

export const selfSingedStateName: ValueFlag = cmdyFlag(
    {
        name: "self-singed-state-name",
        alias: ["ssl-state-name",],
        types: ["string"],
        description: "Set the state name for the self singed certificate",
    },
    "SELF_SINGED_STATE_NAME",
    envData
)

export const selfSingedLocalityName: ValueFlag = cmdyFlag(
    {
        name: "self-singed-locality-name",
        alias: ["ssl-locality-name", "sslln"],
        types: ["string"],
        description: "Set the locality name for the self singed certificate",
    },
    "SELF_SINGED_LOCALITY_NAME",
    envData
)

export const selfSingedOrganizationName: ValueFlag = cmdyFlag(
    {
        name: "self-singed-organization-name",
        alias: ["ssl-organization-name", "sslon"],
        types: ["string"],
        description: "Set the organization name for the self singed certificate",
    },
    "SELF_SINGED_ORGANIZATION_NAME",
    envData
)

export const selfSingedEmailAddress: ValueFlag = cmdyFlag(
    {
        name: "self-singed-email-address",
        alias: ["ssl-email-address", "sslea"],
        types: ["string"],
        description: "Set the email address for the self singed certificate",
    },
    "SELF_SINGED_EMAIL_ADDRESS",
    envData
)

export const selfSingedNetscapeComment: ValueFlag = cmdyFlag(
    {
        name: "self-singed-netscape-comment",
        alias: ["ssl-email-netscape-comment", "sslnc"],
        types: ["string"],
        description: "Set the netscape comment for the self singed certificate",
    },
    "SELF_SINGED_NETSCAPE_COMMENT",
    envData
)

export const bindHostAddress: ValueFlag = cmdyFlag(
    {
        name: "bind-host-address",
        alias: ["b-h-a", "bha", "bind-host-address", "bind-address"],
        shorthand: "b",
        types: ["string"],
        description: "Set the host where the server pind the ports",
    },
    "BIND_ADDRESS",
    envData
)

export const dnsServerAddress: ValueFlag = cmdyFlag(
    {
        name: "dns-server-address",
        alias: ["dns-server", "dnsserveraddress", "dns-address", "dns"],
        types: ["string"],
        description: "Add a dns address to the existing dns addresses",
        multiValues: true,
    },
    "DNS_SERVER_ADDRESSES",
    envData
)



export const certPath: ValueFlag = cmdyFlag(
    {
        name: "cert-path",
        alias: ["certpath"],
        types: ["string"],
        description: "Define the path for the certificates",
    },
    "CERT_PATH",
    envData
)

export const certSuffix: ValueFlag = cmdyFlag(
    {
        name: "cert-suffix",
        alias: ["certsuffix"],
        types: ["string"],
        description: "Define the name for the certificates cert filename suffix",
    },
    "CERT_SUFFIX",
    envData
)

export const keySuffix: ValueFlag = cmdyFlag(
    {
        name: "key-suffix",
        alias: ["keysuffix"],
        types: ["string"],
        description: "Define the name for the certificates key filename suffix",
    },
    "KEY_SUFFIX",
    envData
)

export const caSuffix: ValueFlag = cmdyFlag(
    {
        name: "ca-suffix",
        alias: ["casuffix"],
        types: ["string"],
        description: "Define the name for the certificate ca filename suffix",
    },
    "CA_SUFFIX",
    envData
)

export const maxHeaderSize: ValueFlag = cmdyFlag(
    {
        name: "max-header-size",
        alias: ["headersize", "maxheader", "max-header", "maxheadersize", "header-size"],
        types: ["number", "string"],
        description: "Define the maximum request header size (default: 1024 * 4)",
    },
    "MAX_HEADER_SIZE",
    envData
)

export const connectionTimeout: ValueFlag = cmdyFlag(
    {
        name: "connection-timeout",
        alias: ["connect-timeout", "connecttimeout", "connectt", "connectiontimeout", "connectiont", "ctimeout"],
        types: ["number", "string"],
        description: "Define the maximum time in miliseconds (or as millisecond calucaltion) for a open conneciton",
    },
    "CONNECTION_TIMEOUT",
    envData
)

export const proxyReactionTimeout: ValueFlag = cmdyFlag(
    {
        name: "proxy-reaction-timeout",
        alias: ["proxyreactiontimeout", "prt"],
        types: ["number", "string"],
        description: "Define the maximum time in miliseconds (or as millisecond calucaltion) that the proxy target has to respond",
    },
    "PROXY_REACTION_TIMEOUT",
    envData
)

export const proxyVerifyCertificate: BoolFlag = cmdyFlag(
    {
        name: "proxy-verify-certificate",
        alias: ["proxyverifycertificate", "pvc"],
        description: "Proxy verify target certificates",
    },
    "PROXY_VERIFY_CERTIFICATE",
    envData
)

export const proxyFollowRedirects: BoolFlag = cmdyFlag(
    {
        name: "proxy-follow-redirects",
        alias: ["proxyfollowredirects", "pfr"],
        description: "Proxy follow redirects",
    },
    "PROXY_FOLLOW_REDIRECTS",
    envData
)

const root: CmdDefinition = {
    name: "cprox",
    description: "CProX is a easy to configure redirect, proxy and static webserver",
    details: "You can use CProX as webserver. It can proxy, redirect and service static content on requests",
    flags: [
        dryRun,
        httpPort,
        httpsPort,
        trustAllCerts,
        bindHostAddress,
        disableSelfSinged,
        selfSingedCountryCode,
        selfSingedCommonDomainName,
        selfSingedStateName,
        selfSingedLocalityName,
        selfSingedOrganizationName,
        selfSingedEmailAddress,
        selfSingedNetscapeComment,
        dnsServerAddress,
        certPath,
        certSuffix,
        keySuffix,
        caSuffix,
        rules,
        maxHeaderSize,
        connectionTimeout,
        proxyReactionTimeout,
        proxyVerifyCertificate,
        proxyFollowRedirects,
    ],
    allowUnknownArgs: true,
    cmds: [
        version
    ],
    exe: async (cmd) => {
        env.VERBOSE && console.debug(
            "VERBOSE MODE ENABLED!\n",
            "ENV:",
            JSON.stringify(env, null, 2),
            "\n\n"
        )

        let httpsPort = Number(cmd.valueFlags["https-port"])
        let httpPort = Number(cmd.valueFlags["http-port"])

        if (
            !isNaN(httpsPort) ||
            !isNaN(httpPort)
        ) {
            if (
                !isNaN(httpsPort) &&
                !isNaN(httpPort)
            ) {
                env.HTTP_PORT = httpPort
                env.HTTPS_PORT = httpsPort
            } else if (
                !isNaN(httpPort)
            ) {
                env.HTTP_PORT = httpPort
                env.HTTPS_PORT = null
            } else {
                env.HTTP_PORT = null
                env.HTTPS_PORT = httpsPort
            }
        }

        console.info("CProX| Init...")

        env.VERBOSE && console.debug("CProX| Set dns server addresses...")
        dns.setServers(env.DNS_SERVER_ADDRESSES)

        env.VERBOSE && console.debug("CProX| Load rules...")
        const rawRules = loadRawRules(
            [
                ...cmd.arrayFlags.rule,
                ...cmd.args
            ],
            "RULE_",
            env.VERBOSE
        )

        env.VERBOSE && console.debug("CProX| RawRules:\n", Object.keys(rawRules))
        const parsedRules = parseRules(rawRules)

        env.VERBOSE && console.debug("CProX| ParsedRules:\n", parsedRules.length)
        const rules = sortRules(parsedRules)
        if (rules.length == 0) {
            console.error("No rules found!")
            console.error("Try to run this command with '--help' flag.")
            process.exit(1)
        }
        console.info("CProX| " + rules.length + " rules found!")

        let certLoader: CertLoader = undefined
        if (typeof env.HTTPS_PORT == "number") {
            certLoader = createCertLoader(
                rules.map((r) => r.originHost),
                env.CERT_PATH,
                env.CERT_SUFFIX,
                env.KEY_SUFFIX,
                env.CA_SUFFIX,
                env.DISABLE_SELF_SINGED !== true,
                [
                    {
                        name: "countryName",
                        value: env.SELF_SINGED_COUNTRY_CODE,
                    },
                    {
                        name: "commonName",
                        value: env.SELF_SINGED_COMMON_DOMAIN_NAME,
                    },
                    {
                        name: "stateOrProvinceName",
                        value: env.SELF_SINGED_STATE_NAME,
                    },
                    {
                        name: "localityName",
                        value: env.SELF_SINGED_LOCALITY_NAME,
                    },
                    {
                        name: "organizationName",
                        value: env.SELF_SINGED_ORGANIZATION_NAME,
                    },
                    {
                        name: "emailAddress",
                        value: env.SELF_SINGED_EMAIL_ADDRESS,
                    },
                    {
                        name: "nsComment",
                        value: env.SELF_SINGED_NETSCAPE_COMMENT,
                    }
                ]
            )

            env.VERBOSE && console.debug("CProX| Check rule certificates...")
            await certLoader()
        }

        console.info("CProX| Create resolver...")
        const resolvers = createResolvers(
            rules,
            {
                cacheMillis: 1000 * 60 * 2,
                verbose: env.VERBOSE,
            }
        )
        env.VERBOSE && console.debug("CProX| Resolvers:\n", resolvers.length)

        if (env.DRYRUN) {
            console.debug("CProX| Exit because started in 'dry-run' mode!")
            process.exit(0)
        }

        env.VERBOSE && console.debug("CProX| Create CProX instance...")

        await new CProX(
            resolvers,
            certLoader,
            env.CERT_PATH,
            env.VERBOSE,
        ).init()
    }
}

export default root