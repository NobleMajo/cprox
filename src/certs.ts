import path from "path"
import { FSWatcher, promises as fs, watch } from "fs"
import os from "os"

export interface CertPaths {
    cert: string,
    key: string,
    ca: string,
}

export interface Certs {
    cert: string,
    key: string,
    ca: string,
}

export interface CertWatcher {
    cert: FSWatcher,
    key: FSWatcher,
    ca: FSWatcher,
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

export function touch(filePath: string): Promise<void> {
    return new Promise<void>(async (res, rej) => {
        try {
            let stat
            try {
                stat = await fs.stat(filePath)
                if (stat.isFile()) {
                    return res()
                }
            } catch (error) {
            }
            const splitedPath: string[] = filePath.split("/")
            const fileName = splitedPath.pop()
            if (!fileName) {
                throw new Error("The path '" + filePath + "' is not a file")
            }
            const folder = splitedPath.join("/")
            try {
                stat = await fs.stat(folder)
                if (!stat.isDirectory()) {
                    await fs.mkdir(folder, { recursive: true })
                }
            } catch (error) {
                await fs.mkdir(folder, { recursive: true })
            }
            await fs.writeFile(folder + "/" + fileName, "", "utf8")
            res()
        } catch (err: Error | any) {
            err.stack += "\n" + new Error().stack?.split("\n").slice(1).join("\n")
            rej(err)
        }
    })
}

export function createCertWatcher(
    certPaths: CertPaths,
    changes: (path: string) => any
): Promise<CertWatcher> {
    return new Promise<CertWatcher>(async (res, rej) => {
        try {
            await Promise.all([
                touch(certPaths.cert),
                touch(certPaths.key),
                touch(certPaths.ca)
            ])
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
                ca: watch(
                    certPaths.ca,
                    (event) =>
                        event == "change" ? changes(certPaths.ca) : null
                )
            })
        } catch (err: Error | any) {
            err.stack += "\n" + new Error().stack?.split("\n").slice(1).join("\n")
            rej(err)
        }
    })
}


export async function loadCerts(
    certPaths: CertPaths,
    ignoreEmptyCert: boolean,
): Promise<Certs> {
    return new Promise<Certs>(async (res, rej) => {
        try {
            await Promise.all([
                touch(certPaths.cert),
                touch(certPaths.key),
                touch(certPaths.ca)
            ])
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
            const caPromise = fs.readFile(
                certPaths.ca,
                "utf8",
            )
                .then((buf) => buf.toString())
                .catch(() => "" as string)
            const cert: string = await certPromise
            const key: string = await keyPromise
            const ca: string = await caPromise
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