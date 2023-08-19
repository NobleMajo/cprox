import { FSWatcher, promises as fs, watch } from "fs";
import * as os from "os";
import * as path from "path";
import * as selfsigned from "selfsigned";

export interface CertPaths {
    cert: string,
    key: string,
    ca: string | undefined,
}

export interface HostCertPaths {
    [hostname: string]: CertPaths
}

export interface Certs {
    cert: string,
    key: string,
    ca: string | undefined,
}

export interface CertWatcher {
    cert: FSWatcher,
    key: FSWatcher,
    ca: FSWatcher | undefined,
}

export function fixPath(pathString: string): string {
    if (typeof pathString != "string") {
        throw new Error("pathString must be a string and not: " + typeof pathString + ": " + pathString)
    }
    while (pathString.includes("\\") || pathString.includes("//")) {
        pathString = pathString.replace("\\", "/")
        pathString = pathString.replace("//", "/")
    }
    if (os.platform() === "win32") {
        if (!pathString.match(/^[a-zA-Z]:/)) {
            pathString = process.cwd() + "/" + pathString
        }
        pathString = path.join(...pathString.split("/"))
    } else {
        if (!pathString.startsWith("/")) {
            pathString = process.cwd() + "/" + pathString
        }
        pathString = "/" + path.join(...pathString.split("/"))
    }
    while (pathString.includes("\\") || pathString.includes("//")) {
        pathString = pathString.replace("\\", "/")
        pathString = pathString.replace("//", "/")
    }
    return pathString
}

export function createCertWatcher(
    certDirPath: string,
    change: () => void
): Promise<FSWatcher> {
    return new Promise<FSWatcher>(async (res, rej) => {
        try {
            res(watch(
                certDirPath,
                (event) => event == "change" ? change() : null
            ))
        } catch (err: Error | any) {
            err.stack += "\n" + new Error().stack?.split("\n").slice(1).join("\n")
            rej(err)
        }
    })
}

export async function getFileType(filePath: string): Promise<"FILE" | "DIR" | "NONE"> {
    try {
        const stat = await fs.stat(filePath)
        if (stat.isDirectory()) {
            return "DIR"
        } else if (stat.isFile()) {
            return "FILE"
        } else {
            return "NONE"
        }
    } catch (error) {
        return "NONE"
    }
}

export async function certFilesExist(
    certPaths: CertPaths,
): Promise<boolean> {
    return new Promise<boolean>(async (res, rej) => {
        const certPromise = getFileType(certPaths.cert)
        const keyPromise = getFileType(certPaths.key)

        const cert = await certPromise
        const key = await keyPromise

        if (cert == "FILE" && key == "FILE") {
            res(true)
        } else if (cert == "FILE" || key == "FILE") {
            if (cert == "FILE") {
                rej(new Error(
                    "Cert file exsit but key file does not at: '" + certPaths.key + "'"
                ))
            } else {
                rej(new Error(
                    "Key file exsit but cert file does not at: '" + certPaths.cert + "'"
                ))
            }
        } else {
            res(false)
        }
    })
}

export async function loadCerts(
    certPaths: CertPaths,
): Promise<Certs> {
    return new Promise<Certs>(async (res, rej) => {
        try {
            const certPromise = fs.readFile(
                certPaths.cert,
                "utf8",
            )
                .then((buf) => buf.toString())
                .catch(() => "" as string)
            const keyPromise = fs.readFile(
                certPaths.key,
                "utf8",
            )
                .then((buf) => buf.toString())
                .catch(() => "" as string)
            let caPromise
            if (certPaths.ca) {
                caPromise = fs.readFile(
                    certPaths.ca,
                    "utf8",
                )
                    .then((buf) => buf.toString())
                    .catch(() => "" as string)
            }

            const cert: string = await certPromise
            const key: string = await keyPromise
            let ca: string | undefined
            if (caPromise) {
                ca = await caPromise
            }
            if (!cert || cert.length == 0) {
                rej(new Error("Can't load public cert file from '" + certPaths.cert + "'"))
                return
            }
            if (!key || key.length == 0) {
                rej(new Error("Can't load private key file from '" + certPaths.key + "'"))
                return
            }
            if (ca && ca.length == 0) {
                rej(new Error("Can't load ca file from '" + certPaths.ca + "'"))
                return
            }
            res({
                cert: cert,
                key: key,
                ca: ca,
            })
        } catch (err: Error | any) {
            err.stack += "\n" + new Error().stack?.split("\n").slice(1).join("\n")
            rej(err)
        }
    })
}

export interface SelfSigningOptions {
    commonName: string,
    shortName: string,
}

export type SelfSigningAttributeKeys =
    "countryName" |
    "stateOrProvinceName" |
    "localityName" |
    "organizationName" |
    "commonName" |
    "emailAddress" |
    "subjectKeyIdentifier" |
    "authorityKeyIdentifier" |
    "subjectKeyIdentifier" |
    "basicConstraints" |
    "keyUsage" |
    "subjectAltName" |
    "nsComment"

export interface SelfSigningAttribute {
    name: SelfSigningAttributeKeys,
    value: string,
}

export function generateSelfSigned(
    paths: CertPaths,
    attributes: SelfSigningAttribute[],
): Promise<void> {
    return new Promise<void>((res, rej) => {
        selfsigned.generate(
            attributes,
            {
                keySize: 4092,
                days: 365,
                algorithm: 'sha512',
            },
            async (
                err: Error | any,
                pems: { [key: string]: any }
            ) => {
                if (err) {
                    rej(err)
                    return
                }
                await Promise.all([
                    fs.mkdir(paths.cert.split("/").slice(0, -1).join("/"), {
                        recursive: true
                    }),
                    fs.mkdir(paths.key.split("/").slice(0, -1).join("/"), {
                        recursive: true
                    }),
                ])

                await Promise.all([
                    fs.writeFile(paths.cert, pems.cert),
                    fs.writeFile(paths.key, pems.private),
                ])
                res()
            }
        )
    })
}

const getCertPath = (
    hostname: string,
    certPath: string,
    certSuffix: string,
): string => {
    return fixPath(certPath + "/" + hostname + certSuffix)
}
const getKeyPath = (
    hostname: string,
    certPath: string,
    keySuffix: string,
): string => {
    return fixPath(certPath + "/" + hostname + keySuffix)
}
const getCaPath = (
    hostname: string,
    certPath: string,
    caSuffix: string,
): string => {
    return fixPath(certPath + "/" + hostname + caSuffix)
}

export interface HostCertData {
    [hostname: string]: Certs
}

export function sortHostnamesByParts(hostnames: string[]): string[] {
    return hostnames
        .map((hostname: string) => hostname.toLowerCase().split("."))
        .sort(
            (a, b) =>
                a.length !== b.length
                    ? a.length - b.length
                    : a[0].length - b[0].length
        )
        .map((hostnameParts: string[]) => hostnameParts.join("."))
}

export function getBaseHostnames(hostnames: string[]): { [hostname: string]: string } {
    hostnames = sortHostnamesByParts(hostnames);

    const baseHostnames: { [hostname: string]: string } = {}

    for (const hostname of hostnames) {
        let nearestBaseHostname = ''
        for (const baseHostname of Object.keys(baseHostnames)) {
            if (hostname.endsWith(`.${baseHostname}`)) {
                nearestBaseHostname = baseHostname
            }
        }
        if (nearestBaseHostname.length == 0) {
            nearestBaseHostname = hostname
        }
        baseHostnames[hostname] = nearestBaseHostname
    }

    return baseHostnames
}

export function getAltHostNameMapping(
    baseHostnames: { [hostname: string]: string }
): { [baseHostname: string]: string[] } {

    const mappedAltHostnames: { [baseHostname: string]: string[] } = {}

    for (const hostname of Object.keys(baseHostnames)) {
        const baseHostname = baseHostnames[hostname]
        if (!mappedAltHostnames[baseHostname]) {
            mappedAltHostnames[baseHostname] = [
                hostname
            ]
        } else {
            mappedAltHostnames[baseHostname].push(hostname)
        }
    }

    return mappedAltHostnames
}

export function getAltHostNames(
    mappedAltHostnames: { [baseHostname: string]: string[] }
): { [baseHostname: string]: SelfSigningAttribute[] } {
    const altHostNames: { [baseHostname: string]: SelfSigningAttribute[] } = {}
    for (const baseHostName of Object.keys(mappedAltHostnames)) {
        altHostNames[baseHostName] = mappedAltHostnames[baseHostName].map(
            (hostname): SelfSigningAttribute => ({
                name: "subjectAltName",
                value: "" + hostname,
            })
        )
    }

    return altHostNames
}

export async function loadHostnameCerts(
    hostnames: string[],
    certPathDir: string,
    certSuffix: string,
    keySuffix: string,
    caSuffix: string,
    generateIfMissing: boolean,
    attributes: SelfSigningAttribute[]
): Promise<HostCertData> {
    const stat = await getFileType(certPathDir)
    if (stat != "DIR") {
        if (stat == "FILE") {
            throw new Error("Cert path is a file: " + certPathDir)
        }
        await fs.mkdir(certPathDir, {
            recursive: true
        })
    }

    const baseHostnameMapping = getBaseHostnames(hostnames)
    const altHostnames = getAltHostNames(getAltHostNameMapping(baseHostnameMapping))
    const baseHostnameList = Object.keys(altHostnames)

    const hostCerts: HostCertData = {}

    await Promise.all(
        hostnames.map(async (hostname): Promise<void> => {
            const certPaths: CertPaths = {
                cert: getCertPath(hostname, certPathDir, certSuffix),
                key: getKeyPath(hostname, certPathDir, keySuffix),
                ca: getCaPath(hostname, certPathDir, caSuffix)
            }

            if (!(await certFilesExist(certPaths))) {
                if (!baseHostnameList.includes(hostname)) {
                    return
                }

                if (!generateIfMissing) {
                    throw new Error(
                        "Cert file for hostname '" + hostname + "' is does not exist at '" + certPaths.cert + "'"
                    )
                }

                console.log("generate for: ", certPaths)
                await generateSelfSigned(certPaths, [
                    ...attributes,
                    ...altHostnames[hostname]
                ])
            }

            hostCerts[hostname] = await loadCerts(certPaths)
        })
    )

    return hostCerts
}

export interface LoadedCerts {
    certs: string[],
    keys: string[],
    cas: string[],
}

export async function loadMergedCerts(
    hostnames: string[],
    certPathDir: string,
    certSuffix: string,
    keySuffix: string,
    caSuffix: string,
    generateIfMissing: boolean,
    attributes: SelfSigningAttribute[]
): Promise<LoadedCerts> {
    const data = await loadHostnameCerts(
        hostnames,
        certPathDir,
        certSuffix,
        keySuffix,
        caSuffix,
        generateIfMissing,
        attributes
    )
    const loadedCerts: LoadedCerts = {
        certs: [],
        keys: [],
        cas: [],
    }

    for (const hostname of Object.keys(data)) {
        if (data[hostname].cert && data[hostname].cert.length > 0) {
            loadedCerts.certs.push(data[hostname].cert)
        } else {
            throw new Error("Error while load cert of '" + hostname + "'. Empty file?")
        }
        if (data[hostname].key && data[hostname].key.length > 0) {
            loadedCerts.keys.push(data[hostname].key)
        } else {
            throw new Error("Error while load key of '" + hostname + "'. Empty file?")
        }
        if (data[hostname].ca && data[hostname].ca.length > 0) {
            loadedCerts.cas.push(data[hostname].ca)
        }
    }
    return loadedCerts
}

export type CertLoader = () => Promise<LoadedCerts>

export function createCertLoader(
    hostnames: string[],
    certPathDir: string,
    certSuffix: string,
    keySuffix: string,
    caSuffix: string,
    generateIfMissing: boolean,
    attributes: SelfSigningAttribute[]
): CertLoader {
    return () => loadMergedCerts(
        hostnames,
        certPathDir,
        certSuffix,
        keySuffix,
        caSuffix,
        generateIfMissing,
        attributes
    )
}