import path from "path"
import { promises as fs } from "fs"

export interface StaticRules {
    [path: string]: string
}

export async function loadStaticSettings(
    envVarPrefix: string = "STATIC_",
    useArgs: boolean = true,
): Promise<StaticRules> {
    const rawRules: string[] = []

    for (let i = 1; ; i++) {
        const envVar = process.env[envVarPrefix + i]
        if (typeof envVar != "string") {
            break
        }
        if (envVar.split("=").length != 2) {
            throw new Error(`The environment variable '${envVarPrefix + i}' not contains "=" one time: ${envVar}`)
        }
        rawRules.push(envVar)
    }

    // arg process args to rawRules
    if (useArgs) {
        const args = process.argv.slice(2)
        for (let i = 0; i < args.length; i++) {
            const arg = args[i]
            if (arg.split("=").length != 2) {
                throw new Error(`The ${i + 1}. process argument not contains "=" one time: '${arg}'`)
            }
            rawRules.push(arg)
        }
    }

    const settings: StaticRules = {}
    await Promise.all(
        rawRules.map(
            async (rule) => {
                let [requestPath, targetPath] = rule.split('=')
                requestPath = "/" + path.join(...requestPath.split("/"))
                targetPath = "/" + path.join(...requestPath.split("/"))
                // check if targetPath is a folder or file using fs
                const stat = await fs.stat(targetPath)
                if (!stat.isDirectory() && !stat.isFile()) {
                    throw new Error(`Invalid target path: Folder not exist: ${targetPath}`)
                }
                settings[requestPath] = targetPath
            }
        )
    )

    return settings
}
