import * as path from "path"
import { FSWatcher, promises as fs, watch } from "fs"
import * as  os from "os"
const selfsigned = require("selfsigned")

export interface CertPaths {
    cert: string,
    key: string,
    ca: string | undefined,
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
    certPaths: CertPaths,
    changes: (path: string) => any
): Promise<CertWatcher> {
    return new Promise<CertWatcher>(async (res, rej) => {
        try {
            if (certPaths.ca) {
                try {
                    const stat = await fs.stat(certPaths.ca)
                    if (stat.isFile()) {
                        certPaths.ca = undefined
                    }
                } catch (err) {
                    certPaths.ca = undefined
                }
            }

            res({
                cert: watch(
                    certPaths.cert,
                    (event) =>
                        event == "change" ? changes(certPaths.cert) : null
                ),
                key: watch(
                    certPaths.key,
                    (event) =>
                        event == "change" ? changes(certPaths.key) : null
                ),
                ca: certPaths.ca ?
                    watch(
                        certPaths.ca,
                        (event) =>
                            event == "change" ? changes(certPaths.ca as any) : null
                    ) :
                    undefined
            })
        } catch (err: Error | any) {
            err.stack += "\n" + new Error().stack?.split("\n").slice(1).join("\n")
            rej(err)
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
                rej(new Error("Can't load public cert file!"))
                return
            }
            if (!key || key.length == 0) {
                rej(new Error("Can't load private key file!"))
                return
            }
            if (ca && ca.length == 0) {
                rej(new Error("Can't load ca file!"))
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

export function generateSelfSigned(
    domainName: string,
    paths: CertPaths,
): Promise<void> {
    return new Promise<void>((res, rej) => {

        selfsigned.generate(
            null,
            {
                name: domainName,
                value: domainName,
                keySize: 4092,
                days: 365,
                //algorithm: 'sha256',
                /*extensions: [
                    {
                        name: 'basicConstraints',
                        cA: true,
                    }
                ],*/
                //pkcs7: false,
                //clientCertificate: false,
                //clientCertificateCN: 'none'
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
                    fs.writeFile(paths.cert, pems.cert),
                    fs.writeFile(paths.key, pems.private),
                ])
                res()
            }
        )
    })
}