import { BoolFlag, CmdParserOptions, parseCmd } from "cmdy"
import { cmdyFlag } from "typenvy"
import root from "./cmd/root"
import { envData } from "./env/envParser"

console.log("TYPESCRIPT!!!")

export const verbose: BoolFlag = cmdyFlag(
    {
        name: "verbose",
        shorthand: "v",
        description: "Show basic flag adn target informations",
    },
    "VERBOSE",
    envData
)

export const cmdOptions: CmdParserOptions = {
    cmd: root,
    globalFlags: [
        verbose,
    ],
    globalHelpMsg: "! CProX | by majo418 | supported by CoreUnit.NET !",
}

export default parseCmd(cmdOptions)
    .exe()
    .catch((err: Error | any) => console.error(
        "# CProX Error #\n", err
    ))
