import { CmdDefinition, CmdParserOptions, BoolFlag, ValueFlag, Awaitable } from "cmdy"
import env from "../env/envParser"


export const json: BoolFlag = {
    name: "json",
    alias: ["quiet"],
    shorthand: "j",
    description: "Shows output as json",
}


const version: CmdDefinition = {
    name: "version",
    description: "Shows the version of cprox",
    flags: [
        json
    ],
    allowUnknownArgs: false,
    cmds: [],
    /**
     * @description enables verbose mode and outputs version, license, author, and
     * description information in a structured format.
     * 
     * @param { `async` (cmd) value. } cmd - command being executed and is used to determine
     * the output format for the functions.
     * 
     * 		- `flags`: An array of strings representing the command-line flags passed to the
     * program.
     * 		- `json`: A boolean indicating whether the `-json` flag was passed, which triggers
     * the output of JSON data.
     * 
     * 
     * @returns { string } a series of hyphenated lines and information about the version,
     * license, author, and description of the software.
     */
    exe: async (cmd) => {
        env.VERBOSE && console.debug(
            "VERBOSE MODE ENABLED!\n",
            "ENV:",
            JSON.stringify(env, null, 2),
            "\n\n"
        )

        const packageJson = require("../../package.json")

        if (cmd.flags.includes("json")) {
            console.info(JSON.stringify({
                name: "CProX",
                version: packageJson.version,
                license: packageJson.license,
                author: packageJson.author,
            }, null, 4))
            return
        }

        console.info(" ,-----.,------.              ,--.   ,--.")
        console.info("'  .--./|  .--. ',--.--. ,---. \  `.'  / ")
        console.info("|  |    |  '--' ||  .--'| .-. | .'    \  ")
        console.info("'  '--'\|  | --' |  |   ' '-' '/  .'.  \ ")
        console.info(" `-----'`--'     `--'    `---''--'   '--'")
        console.info("")
        console.info("Version " + packageJson.version)
        console.info("License " + packageJson.license)
        console.info("Author " + packageJson.author)
        console.info("")
        console.info("" + packageJson.description)
    }
}

export default version
