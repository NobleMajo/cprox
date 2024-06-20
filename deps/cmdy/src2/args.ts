import { splitArrayByFirst } from "./base"
import { Char, filterChars } from "./Char"

export type ProcessArgumentFilter = (
    args: string[]
) => string[]

export const nodejsSliceArgumentFilter: ProcessArgumentFilter = (
    args
) => {
    return args.slice(2)
}

let defaultArgumentFilter: ProcessArgumentFilter = nodejsSliceArgumentFilter
export function setDefaultArgumentFilter(
    parser: ProcessArgumentFilter
): void {
    defaultArgumentFilter = parser
}

export function resetDefaultArgumentFilter(): void {
    defaultArgumentFilter = nodejsSliceArgumentFilter
}

export function getDefaultArgumentFilter(): ProcessArgumentFilter {
    return defaultArgumentFilter
}

export function getOriginDefaultArgumentFilter(): ProcessArgumentFilter {
    return nodejsSliceArgumentFilter
}

export function getProcessArgs(
    args?: string[] | undefined,
    parser: ProcessArgumentFilter = defaultArgumentFilter
): string[] {
    return parser(args ?? process.argv)
}

export interface FlagPlan {
    stringFlags: string[],
    booleanFlags: string[],
    numberFlags: string[],
    aliasMap: {
        [alias: string | Char]: string
    },
}

export interface FlagData {
    stringFlags: {
        [flag: string]: string
    },
    numberFlags: {
        [flag: string]: number
    },
    booleanFlags: {
        [flag: string]: boolean
    },
    flagSource: {
        [flag: string]: string
    },
    preArgs: string[],
    postArgs: string[],
}

export function validateFlagPlan(
    plan: FlagPlan,
): void {
    const aliases = Object.keys(plan.aliasMap)
    for (const alias of aliases) {
        if (alias.includes("_")) {
            throw new Error(
                "Alias '" + alias +
                "' includes this '_' not allowed flag character "
            )
        }
        const alias2 = alias.toLowerCase()
        if (alias != alias2) {
            throw new Error(
                "Alias '" + alias +
                "' is not in lower case"
            )
        }
    }
    const stringFlags = Object.keys(plan.stringFlags)
    for (const flag of stringFlags) {
        if (flag.includes("_")) {
            throw new Error(
                "String flag '" + flag +
                "' includes this '_' not allowed flag character "
            )
        }
        const flag2 = flag.toLowerCase()
        if (flag2 != flag) {
            throw new Error(
                "String flag '" + flag +
                "' is not in lower case"
            )
        }
    }
    const numberFlags = Object.keys(plan.numberFlags)
    for (const flag of numberFlags) {
        if (flag.includes("_")) {
            throw new Error(
                "Number flag '" + flag +
                "' includes this '_' not allowed flag character "
            )
        }
        const flag2 = flag.toLowerCase()
        if (flag2 != flag) {
            throw new Error(
                "Number flag '" + flag +
                "' is not in lower case"
            )
        }
    }
    const booleanFlags = Object.keys(plan.booleanFlags)
    for (const flag of booleanFlags) {
        if (flag.includes("_")) {
            throw new Error(
                "Boolean flag '" + flag +
                "' includes this '_' not allowed flag character "
            )
        }
        const flag2 = flag.toLowerCase()
        if (flag2 != flag) {
            throw new Error(
                "Boolean flag '" + flag +
                "' is not in lower case"
            )
        }
    }

    for (const alias of aliases) {
        for (const stringFlag of stringFlags) {
            if (alias == stringFlag) {
                throw new Error("'" + alias + "' is used as alias and as string flag")
            }
            for (const numberFlag of numberFlags) {
                if (numberFlag == alias) {
                    throw new Error("'" + alias + "' is used as alias and as number flag")
                }
                if (numberFlag == stringFlag) {
                    throw new Error("'" + alias + "' is used as number flag and as string flag")
                }
                for (const booleanFlag of booleanFlags) {
                    if (booleanFlag == alias) {
                        throw new Error("'" + alias + "' is used as alias and as boolean flag")
                    }
                    if (booleanFlag == stringFlag) {
                        throw new Error("'" + alias + "' is used as boolean flag and as string flag")
                    }
                    if (booleanFlag == numberFlag) {
                        throw new Error("'" + alias + "' is used as boolean flag and as number flag")
                    }
                }
            }
        }

    }
}

export function parseArgumentFlags(
    args: string[],
    plan: FlagPlan,
): FlagData {
    validateFlagPlan(plan)
    const aliases = Object.keys(plan.aliasMap)
    const filteredChars = filterChars(aliases)

    const data: FlagData = {
        flagSource: {},
        stringFlags: {},
        numberFlags: {},
        booleanFlags: {},
        preArgs: undefined as any,
        postArgs: undefined as any,
    }
    for (const booleanFlag of plan.booleanFlags) {
        data.booleanFlags[booleanFlag] = false
    }
    for (const numberFlag of plan.numberFlags) {
        data.numberFlags[numberFlag] = 0
    }
    const [preArgs, postArgs] = splitArrayByFirst(
        args,
        "--",
    )

    const preArgs2: string[] = []
    let arg: string
    let srcArg: string
    while (preArgs.length > 0) {
        srcArg = preArgs.shift() as string
        if (!srcArg) {
            break
        }
        arg = srcArg.toLowerCase()
        if (arg.charAt(0) == "-") {
            if (arg.charAt(1) != "-") {
                arg = arg.substring(1)
                const shorthands = arg.split("").reverse()
                for (const shorthand of shorthands) {
                    if (
                        !filteredChars[0]
                            .includes(shorthand)
                    ) {
                        throw new Error(
                            "Unknown shorthand flag '" +
                            shorthand + "'"
                        )
                    }
                    let flag = plan.aliasMap[shorthand] ?? shorthand
                    if (plan.booleanFlags[flag]) {
                        data.booleanFlags[flag] = true
                    } else if (plan.numberFlags[flag]) {
                        data.numberFlags[flag]++
                    } else {
                        data.stringFlags[flag] = preArgs.shift()
                    }
                    data.flagSource[flag] = shorthand
                }
            } else {
                arg = arg.substring(2)
                let flag = plan.aliasMap[arg] ?? arg
                if (plan.booleanFlags[flag]) {
                    data.booleanFlags[flag] = true
                } else if (plan.numberFlags[flag]) {
                    data.numberFlags[flag]++
                } else {
                    data.stringFlags[flag] = preArgs.shift()
                }
                data.flagSource[flag] = arg
            }
        } else {
            preArgs2.push(srcArg)
        }
    }
    data.preArgs = preArgs2
    data.postArgs = postArgs
    return data
}
