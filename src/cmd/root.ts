import { BoolFlag, CmdDefinition, ValueFlag } from "cmdy"
import * as dns from "dns"
import { cmdyFlag } from "typenvy"
import { fixPath } from "../certs"
import { CProX } from "../cprox"
import env, { envData } from "../env/envParser"
import { createResolvers } from "../resolver"
import { loadRawRules, parseRules, sortRules } from "../rule"
import version from "./version"

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

export const certName: ValueFlag = cmdyFlag(
    {
        name: "cert-name",
        alias: ["certname"],
        types: ["string"],
        description: "Define the name for the certificates cert file",
    },
    "CERT_NAME",
    envData
)

export const keyName: ValueFlag = cmdyFlag(
    {
        name: "key-name",
        alias: ["keyname"],
        types: ["string"],
        description: "Define the name for the certificates key file",
    },
    "KEY_NAME",
    envData
)
export const caName: ValueFlag = cmdyFlag(
    {
        name: "ca-name",
        alias: ["caname"],
        types: ["string"],
        description: "Define the name for the certificate ca file",
    },
    "CA_NAME",
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
        certName,
        keyName,
        caName,
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

        env.VERBOSE && console.debug("CProX| Set cert paths...")
        const certPaths = {
            cert: fixPath(env.CERT_PATH + "/" + env.CERT_NAME),
            key: fixPath(env.CERT_PATH + "/" + env.KEY_NAME),
            ca: fixPath(env.CERT_PATH + "/" + env.CA_NAME),
        }

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
            certPaths,
            env.VERBOSE
        ).init()
    }
}

export default root