import "mocha"
import "chai"
import { parseCmd, CmdDefinition, Flag, getProcessArgs, ValueFlag, BoolFlag } from '../index';
import { expect } from "chai"
import exp = require("constants");

export type AllTypes = "string" | "number" | "object" |
    "instance" | "function" | "class" | "array" | "null" |
    "undefined" | "symbol" | "bigint" | "boolean"

export function getType(any: any): AllTypes {
    const type = typeof any
    if (type == "object") {
        if (any == null) {
            return "null"
        } else if (Array.isArray(any)) {
            return "array"
        } else if (
            any.constructor &&
            typeof any.constructor.name == "string" &&
            any.constructor.name != "Object"
        ) {
            return "instance"
        }
    }
    return type
}

let exec: boolean
const simpleCmd: CmdDefinition = {
    name: "simple",
    description: "A simple test command!",
    exe: async () => { exec = true }
}

describe('base cmd tests', () => {
    beforeEach(() => {
        exec = false
    })

    it("get process args method", async () => {
        expect(JSON.stringify(
            getProcessArgs().args
        )).is.equals(
            JSON.stringify([
                "--require",
                "ts-node/register",
                "src/test/**/*.test.ts"
            ])
        )
    })

    it("cmd", async () => {
        let res = parseCmd({
            cmd: simpleCmd,
            args: [],
        })

        expect(exec).is.false
        res = await res.exe()

        expect(res).is.not.undefined
        expect(res.err).is.undefined
        expect(exec).is.true

        expect(res.flags).is.not.undefined
        expect(getType(res.flags)).is.equals("array")
        expect(res.flags.length).is.equals(0)

        expect(res.valueFlags).is.not.undefined
        expect(getType(res.valueFlags)).is.equals("object")
        expect(Object.keys(res.valueFlags).length).is.equals(0)
    })

    it("test flags args", async () => {
        const test: BoolFlag = {
            name: "test",
            description: "A test flag",
        }

        const qwer: BoolFlag = {
            name: "qwer",
            description: "A qwer flag",
        }

        const qwe1: ValueFlag = {
            name: "qwe1",
            description: "A qwe1 flag",
            types: ["string"]
        }

        const qwe2: ValueFlag = {
            name: "qwe2",
            description: "A qwe2 flag",
            types: ["string"]
        }

        simpleCmd.flags = [
            test,
            qwer,
            qwe1,
            qwe2
        ]

        let res = parseCmd({
            cmd: simpleCmd,
            args: [
                "--qwe1",
                "test",
                "--test",
            ],
        })

        expect(exec).is.false
        res = await res.exe()
        expect(exec).is.true

        expect(res.args.length).is.equals(0)
        expect(res.err).is.undefined

        expect(res.flags.includes("test")).is.true
        expect(res.flags.includes("qwer")).is.false

        expect(Object.keys(res.valueFlags).length).is.equals(1)
        expect(res.valueFlags.qwe1).is.not.undefined
        expect(typeof res.valueFlags.qwe1).is.equals("string")
        expect(res.valueFlags.qwe1).is.equals("test")

        expect(Object.keys(res.arrayFlags).length).is.equals(0)
    })
})

describe('unknown args tests', () => {
    beforeEach(() => {
        exec = false
    })

    it("dont allow unknown args", async () => {
        const test: BoolFlag = {
            name: "test",
            description: "A test flag",
        }

        const qwer: BoolFlag = {
            name: "qwer",
            description: "A qwer flag",
        }

        const qwe1: ValueFlag = {
            name: "qwe1",
            description: "A qwe1 flag",
            types: ["string"]
        }

        const qwe2: ValueFlag = {
            name: "qwe2",
            description: "A qwe2 flag",
            types: ["string"]
        }

        simpleCmd.flags = [
            test,
            qwer,
            qwe1,
            qwe2
        ]

        let res = parseCmd({
            cmd: simpleCmd,
            args: ["--qwe1", "test", "ddd", "--test", "asdasd"]
        })

        expect(typeof res.err).is.equals("object")
        expect(res.args.length).is.equals(0)
        expect(res.err.message).is.equals('Unknown command argument: "ddd"')
    })

    it("allow unknown args", async () => {
        const test: BoolFlag = {
            name: "test",
            description: "A test flag",
        }

        const qwer: BoolFlag = {
            name: "qwer",
            description: "A qwer flag",
        }

        const qwe1: ValueFlag = {
            name: "qwe1",
            description: "A qwe1 flag",
            types: ["string"]
        }

        const qwe2: ValueFlag = {
            name: "qwe2",
            description: "A qwe2 flag",
            types: ["string"]
        }

        simpleCmd.flags = [
            test,
            qwer,
            qwe1,
            qwe2
        ]

        let res = parseCmd({
            cmd: {
                ...simpleCmd,
                allowUnknownArgs: true,
            },
            args: ["--qwe1", "test", "ddd", "--test", "asdasd"]
        })

        expect(exec).is.false
        res = await res.exe()
        expect(exec).is.true

        expect(res.args.length).is.equals(2)
        expect(res.err).is.undefined

        expect(res.flags.includes("test")).is.true
        expect(res.flags.includes("qwer")).is.false

        expect(res.valueFlags.qwe1).is.not.undefined
        expect(typeof res.valueFlags.qwe1).is.equals("string")
        expect(res.valueFlags.qwe1).is.equals("test")
    })

    it("allow just args", async () => {
        const test: BoolFlag = {
            name: "test",
            description: "A test flag",
        }

        const qwer: BoolFlag = {
            name: "qwer",
            description: "A qwer flag",
        }

        const qwe1: ValueFlag = {
            name: "qwe1",
            description: "A qwe1 flag",
            types: ["string"]
        }

        const qwe2: ValueFlag = {
            name: "qwe2",
            description: "A qwe2 flag",
            types: ["string"]
        }

        simpleCmd.flags = [
            test,
            qwer,
            qwe1,
            qwe2
        ]

        let res = parseCmd({
            cmd: {
                ...simpleCmd,
                allowUnknownArgs: true,
            },
            args: ["qwe1", "test", "ddd", "test", "asdasd"]
        })

        expect(exec).is.false
        res = await res.exe()
        expect(exec).is.true

        expect(res.args.length).is.equals(5)
        expect(res.err).is.undefined

        expect(res.flags.includes("test")).is.false
        expect(res.flags.includes("qwer")).is.false

        expect(typeof res.valueFlags).is.equals("object")
        expect(Object.keys(res.valueFlags).length).is.equals(0)
    })
})

const requireCmd: CmdDefinition = {
    name: "test",
    description: "some test command",
    flags: [
        {
            name: "path",
            description: "some path flag",
            required: true,
            types: ["string"],
        }
    ]
}

describe('required flag', () => {
    it("require flag test", async () => {
        let res = parseCmd({
            cmd: requireCmd,
            args: ["--path", "/test/wow/home"],
        })

        expect(typeof res).is.equals("object")
        expect(res.err).is.undefined
        expect(typeof res.cmd).is.equals("object")
        expect(typeof res.valueFlags).is.equals("object")
        expect(typeof res.valueFlags.path).is.equals("string")
        expect(typeof res.valueFlags.path[0]).is.equals("string")
    })

    it("require flag error", async () => {
        let res = parseCmd({
            cmd: requireCmd,
            args: [],
        })

        expect(typeof res).is.equals("object")
        expect(typeof res.err).is.equals("object")
        expect(res.err.message).is.equals("Flag 'path' is required but not set!")
    })
})

const subsubsubCmd: CmdDefinition = {
    name: "subsubsub",
    description: "some sub sub sub command",
    flags: [],
    allowUnknownArgs: true,
    allowUnknownFlags: true,
}

const subsubCmd: CmdDefinition = {
    name: "subsub",
    description: "some sub sub command",
    flags: [],
    allowUnknownArgs: true,
    allowUnknownFlags: true,
    cmds: [subsubsubCmd],
}

const subCmd: CmdDefinition = {
    name: "sub",
    description: "some sub command",
    flags: [],
    allowUnknownArgs: true,
    allowUnknownFlags: true,
    cmds: [subsubCmd],
}

const superCmd: CmdDefinition = {
    name: "root",
    description: "some super root command",
    flags: [
        {
            name: "verbose",
            description: "some path flag",
            shorthand: "v",
        }
    ],
    allowUnknownArgs: false,
    allowUnknownFlags: true,
    cmds: [
        requireCmd,
        simpleCmd,
        subCmd,
    ],
}

describe('sub commands tests', () => {
    it("check super cmd without args", async () => {
        exec = false
        let res = parseCmd({
            cmd: superCmd,
            args: [],
        })

        expect(exec).is.false
        expect(res.helpResult).is.true

        expect(res).is.not.undefined
        expect(res.err).is.undefined
        expect(exec).is.false

        expect(res.flags).is.not.undefined
        expect(getType(res.flags)).is.equals("array")
        expect(res.flags.length).is.equals(0)
        expect(res.args.length).is.equals(0)

        expect(res.valueFlags).is.not.undefined
        expect(getType(res.valueFlags)).is.equals("object")
        expect(Object.keys(res.valueFlags).length).is.equals(0)
    })

    it("check super cmd with random undefined args", async () => {
        exec = false
        let res = parseCmd({
            cmd: superCmd,
            args: ["asdad", "pkvjrklgdf", "ölkiecnfvdnf", "-path", "-g", "sldkfjsdogvb", "osiucbs"],
        })

        expect(exec).is.false
        expect(res.helpResult).is.true

        expect(res).is.not.undefined
        expect(typeof res.err).is.equals("object")
        expect(res.err.message).is.equals('Unknown command argument: "asdad"')

        expect(res.flags).is.not.undefined
        expect(getType(res.flags)).is.equals("array")
        expect(res.args.length).is.equals(0)
        expect(res.flags.length).is.equals(0)

        expect(res.valueFlags).is.not.undefined
        expect(getType(res.valueFlags)).is.equals("object")
        expect(Object.keys(res.valueFlags).length).is.equals(0)
    })

    it("check sub cmd without arg", async () => {
        exec = false
        let res = parseCmd({
            cmd: superCmd,
            args: ["sub"],
        })

        expect(exec).is.false
        expect(res.helpResult).is.true

        expect(res).is.not.undefined
        expect(res.err).is.undefined

        expect(res.flags).is.not.undefined
        expect(getType(res.flags)).is.equals("array")
        expect(res.args.length).is.equals(0)
        expect(res.flags.length).is.equals(0)

        expect(res.valueFlags).is.not.undefined
        expect(getType(res.valueFlags)).is.equals("object")
        expect(Object.keys(res.valueFlags).length).is.equals(0)
    })

    it("check sub with random args", async () => {
        exec = false
        let res = parseCmd({
            cmd: superCmd,
            args: ["sub", "asdad", "lvkjfvb", "csoicjkso", "--flagtest", "asdad", "-v", "09ev0weuv"],
        })

        expect(exec).is.false
        expect(res.helpResult).is.true

        expect(res.cmd.name).is.equals("sub")

        expect(res).is.not.undefined
        expect(res.err).is.undefined

        expect(res.flags).is.not.undefined
        expect(getType(res.flags)).is.equals("array")
        expect(res.args.length).is.equals(7)
        expect(res.flags.length).is.equals(0)

        expect(res.valueFlags).is.not.undefined
        expect(getType(res.valueFlags)).is.equals("object")
        expect(Object.keys(res.valueFlags).length).is.equals(0)
    })

    it("check subsubsub with random args", async () => {
        exec = false
        let res = parseCmd({
            cmd: superCmd,
            args: ["sub", "subsub", "subsubsub", "asdad", "lvkjfvb", "csoicjkso", "--flagtest", "asdad", "-v", "09ev0weuv"],
        })

        expect(exec).is.false
        expect(res.helpResult).is.true

        expect(res.cmd.name).is.equals("subsubsub")

        expect(res).is.not.undefined
        expect(res.err).is.undefined

        expect(res.flags).is.not.undefined
        expect(getType(res.flags)).is.equals("array")
        expect(res.args.length).is.equals(7)
        expect(res.flags.length).is.equals(0)

        expect(res.valueFlags).is.not.undefined
        expect(getType(res.valueFlags)).is.equals("object")
        expect(Object.keys(res.valueFlags).length).is.equals(0)
    })

    it("check sub is in sub", async () => {
        exec = false
        let res = parseCmd({
            cmd: superCmd,
            args: ["sub", "sub", "asdad", "lvkjfvb", "csoicjkso", "--flagtest", "asdad", "-v", "09ev0weuv"],
        })

        expect(exec).is.false
        expect(res.helpResult).is.true

        expect(res.cmd.name).is.equals("sub")

        expect(res).is.not.undefined
        expect(res.err).is.undefined

        expect(res.flags).is.not.undefined
        expect(getType(res.flags)).is.equals("array")
        expect(res.args.length).is.equals(8)
        expect(res.args[0]).is.equals("sub")
        expect(res.flags.length).is.equals(0)

        expect(res.valueFlags).is.not.undefined
        expect(getType(res.valueFlags)).is.equals("object")
        expect(Object.keys(res.valueFlags).length).is.equals(0)
    })
})

let verbose: boolean
let path: string[]
let number: string[]

const execFlagCmd: CmdDefinition = {
    name: "execflagcmd",
    description: "some command with executable flags",
    flags: [
        {
            name: "verbose",
            description: "some path flag",
            shorthand: "v",
            exe(res) {
                verbose = true
            }
        },
        {
            name: "path",
            description: "some path flag",
            shorthand: "p",
            types: ["string"],
            multiValues: true,
            exe(res, value) {
                path.push(value)
            }
        },
        {
            name: "number",
            description: "some number flag",
            shorthand: "n",
            types: ["number"],
            multiValues: true,
            exe(res, value) {
                number.push(value)
            }
        },
    ],
    exe: async (cmd) => { exec = true }
}

describe('executable flags', () => {
    beforeEach(() => {
        exec = false
        verbose = false
        path = []
        number = []
    })

    it("check without flags", async () => {
        let res = parseCmd({
            cmd: execFlagCmd,
            args: [],
        })

        expect(exec).is.false
        res = await res.exe()
        expect(exec).is.true

        expect(res.args.length).is.equals(0)
        expect(res.err).is.undefined

        expect(res).is.not.undefined
        expect(res.err).is.undefined

        expect(verbose).is.false
        expect(path.length).is.equals(0)
        expect(number.length).is.equals(0)

        expect(res.flags).is.not.undefined
        expect(getType(res.flags)).is.equals("array")
        expect(res.flags.length).is.equals(0)
        expect(res.args.length).is.equals(0)

        expect(res.valueFlags).is.not.undefined
        expect(getType(res.valueFlags)).is.equals("object")
        expect(Object.keys(res.valueFlags).length).is.equals(0)

        expect(res.arrayFlags).is.not.undefined
        expect(getType(res.arrayFlags)).is.equals("object")
        expect(Object.keys(res.arrayFlags).length).is.equals(2)
        expect(Object.keys(res.arrayFlags.path).length).is.equals(0)
        expect(Object.keys(res.arrayFlags.number).length).is.equals(0)
    })

    it("check with verbose", async () => {
        let res = parseCmd({
            cmd: execFlagCmd,
            args: ["-v"],
        })

        expect(exec).is.false
        res = await res.exe()
        expect(exec).is.true

        expect(res.args.length).is.equals(0)
        expect(res.err).is.undefined

        expect(res).is.not.undefined
        expect(res.err).is.undefined

        expect(verbose).is.true
        expect(path.length).is.equals(0)
        expect(number.length).is.equals(0)

        expect(res.flags).is.not.undefined
        expect(getType(res.flags)).is.equals("array")
        expect(res.flags.length).is.equals(1)
        expect(res.args.length).is.equals(0)

        expect(res.valueFlags).is.not.undefined
        expect(getType(res.valueFlags)).is.equals("object")
        expect(Object.keys(res.valueFlags).length).is.equals(0)

        expect(res.arrayFlags).is.not.undefined
        expect(getType(res.arrayFlags)).is.equals("object")
        expect(Object.keys(res.arrayFlags).length).is.equals(2)
        expect(Object.keys(res.arrayFlags.path).length).is.equals(0)
        expect(Object.keys(res.arrayFlags.number).length).is.equals(0)
    })

    it("check with one path", async () => {
        let res = parseCmd({
            cmd: execFlagCmd,
            args: ["--path", "/var/www/html"],
        })

        expect(exec).is.false
        res = await res.exe()
        expect(exec).is.true

        expect(res.args.length).is.equals(0)
        expect(res.err).is.undefined

        expect(res).is.not.undefined
        expect(res.err).is.undefined

        expect(verbose).is.false
        expect(path.length).is.equals(1)
        expect(path[0]).is.equals("/var/www/html")
        expect(number.length).is.equals(0)

        expect(res.flags).is.not.undefined
        expect(getType(res.flags)).is.equals("array")
        expect(res.flags.length).is.equals(0)
        expect(res.args.length).is.equals(0)

        expect(res.valueFlags).is.not.undefined
        expect(getType(res.valueFlags)).is.equals("object")
        expect(Object.keys(res.valueFlags).length).is.equals(0)

        expect(res.arrayFlags).is.not.undefined
        expect(getType(res.arrayFlags)).is.equals("object")
        expect(Object.keys(res.arrayFlags).length).is.equals(2)
        expect(Object.keys(res.arrayFlags.path).length).is.equals(1)
        expect(res.arrayFlags.path[0]).is.equals("/var/www/html")
        expect(Object.keys(res.arrayFlags.number).length).is.equals(0)
    })

    it("check with multiple paths", async () => {
        let res = parseCmd({
            cmd: execFlagCmd,
            args: [
                "--path", "/var/www/html",
                "--path", "/some/new/path",
                "--path", "/some/old/path",
                "--path", "/test/path"
            ],
        })

        expect(exec).is.false
        res = await res.exe()
        expect(exec).is.true

        expect(res.args.length).is.equals(0)
        expect(res.err).is.undefined

        expect(res).is.not.undefined
        expect(res.err).is.undefined

        expect(verbose).is.false
        expect(path.length).is.equals(4)
        expect(JSON.stringify(path)).is.equals(JSON.stringify([
            "/var/www/html",
            "/some/new/path",
            "/some/old/path",
            "/test/path"
        ]))
        expect(number.length).is.equals(0)

        expect(res.flags).is.not.undefined
        expect(getType(res.flags)).is.equals("array")
        expect(res.flags.length).is.equals(0)
        expect(res.args.length).is.equals(0)

        expect(res.valueFlags).is.not.undefined
        expect(getType(res.valueFlags)).is.equals("object")
        expect(Object.keys(res.valueFlags).length).is.equals(0)

        expect(res.arrayFlags).is.not.undefined
        expect(getType(res.arrayFlags)).is.equals("object")
        expect(Object.keys(res.arrayFlags).length).is.equals(2)
        expect(Object.keys(res.arrayFlags.path).length).is.equals(4)
        expect(JSON.stringify(res.arrayFlags.path)).is.equals(JSON.stringify([
            "/var/www/html",
            "/some/new/path",
            "/some/old/path",
            "/test/path"
        ]))
        expect(res.valueFlags.number).is.undefined
    })

    it("check with multiple paths and numbers and verbose", async () => {
        let res = parseCmd({
            cmd: execFlagCmd,
            args: [
                "--number", "1",
                "--path", "/var/www/html",
                "--path", "/some/new/path",
                "-v",
                "--path", "/some/old/path",
                "--number", "2",
                "--number", "3",
                "--number", "4",
                "--number", "5",
                "--number", "6",
                "--path", "/test/path"
            ],
        })

        expect(exec).is.false
        res = await res.exe()
        expect(exec).is.true

        expect(res.args.length).is.equals(0)
        expect(res.err).is.undefined

        expect(res).is.not.undefined
        expect(res.err).is.undefined

        expect(verbose).is.true
        expect(path.length).is.equals(4)
        expect(JSON.stringify(path)).is.equals(JSON.stringify([
            "/var/www/html",
            "/some/new/path",
            "/some/old/path",
            "/test/path"
        ]))
        expect(number.length).is.equals(6)
        expect(JSON.stringify(number)).is.equals(JSON.stringify([
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
        ]))

        expect(res.flags).is.not.undefined
        expect(getType(res.flags)).is.equals("array")
        expect(res.flags.length).is.equals(1)
        expect(res.args.length).is.equals(0)

        expect(res.valueFlags).is.not.undefined
        expect(getType(res.valueFlags)).is.equals("object")
        expect(Object.keys(res.valueFlags).length).is.equals(0)

        expect(res.arrayFlags).is.not.undefined
        expect(getType(res.arrayFlags)).is.equals("object")
        expect(Object.keys(res.arrayFlags).length).is.equals(2)
        expect(Object.keys(res.arrayFlags.path).length).is.equals(4)
        expect(JSON.stringify(res.arrayFlags.path)).is.equals(JSON.stringify([
            "/var/www/html",
            "/some/new/path",
            "/some/old/path",
            "/test/path"
        ]))
        expect(Object.keys(res.arrayFlags.number).length).is.equals(6)
        expect(JSON.stringify(res.arrayFlags.number)).is.equals(JSON.stringify([
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
        ]))
    })

    it("check error on unknown arg", async () => {
        let res = parseCmd({
            cmd: execFlagCmd,
            args: [
                "--number", "1",
                "--path", "/var/www/html",
                "--path", "/some/new/path",
                "-v",
                "--path", "/some/old/path",
                "--number", "2",
                "--number", "3",
                "asdasd",
                "--number", "4",
                "--number", "5",
                "--number", "6",
                "--path", "/test/path"
            ],
        })

        expect(typeof res.err).is.equals("object")
        expect(res.err.message).is.equals('Unknown command argument: "asdasd"')
    })

    it("check error on unknown allowed arg", async () => {
        let res = parseCmd({
            cmd: {
                ...execFlagCmd,
                allowUnknownArgs: true,
            },
            args: [
                "--number", "1",
                "--path", "/var/www/html",
                "--path", "/some/new/path",
                "-v",
                "--path", "/some/old/path",
                "--number", "2",
                "--number", "3",
                "asdasd",
                "--number", "4",
                "--number", "5",
                "--number", "6",
                "--path", "/test/path"
            ],
        })

        expect(exec).is.false
        res = await res.exe()
        expect(exec).is.true

        expect(res.args.length).is.equals(1)
        expect(res.args[0]).is.equals("asdasd")
        expect(res.err).is.undefined

        expect(res).is.not.undefined
        expect(res.err).is.undefined

        expect(verbose).is.true
        expect(path.length).is.equals(4)
        expect(JSON.stringify(path)).is.equals(JSON.stringify([
            "/var/www/html",
            "/some/new/path",
            "/some/old/path",
            "/test/path"
        ]))
        expect(number.length).is.equals(6)
        expect(JSON.stringify(number)).is.equals(JSON.stringify([
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
        ]))

        expect(res.flags).is.not.undefined
        expect(getType(res.flags)).is.equals("array")
        expect(res.flags.length).is.equals(1)
        expect(res.args.length).is.equals(1)
        expect(res.args[0]).is.equals("asdasd")

        expect(res.valueFlags).is.not.undefined
        expect(getType(res.valueFlags)).is.equals("object")
        expect(Object.keys(res.valueFlags).length).is.equals(0)

        expect(res.arrayFlags).is.not.undefined
        expect(getType(res.arrayFlags)).is.equals("object")
        expect(Object.keys(res.arrayFlags).length).is.equals(2)
        expect(Object.keys(res.arrayFlags.path).length).is.equals(4)
        expect(JSON.stringify(res.arrayFlags.path)).is.equals(JSON.stringify([
            "/var/www/html",
            "/some/new/path",
            "/some/old/path",
            "/test/path"
        ]))
        expect(Object.keys(res.arrayFlags.number).length).is.equals(6)
        expect(JSON.stringify(res.arrayFlags.number)).is.equals(JSON.stringify([
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
        ]))
    })


    it("check error on unknown flag", async () => {
        let res = parseCmd({
            cmd: execFlagCmd,
            args: [
                "--number", "1",
                "--path", "/var/www/html",
                "--path", "/some/new/path",
                "-v",
                "--path", "/some/old/path",
                "--number", "2",
                "--number", "3",
                "--port",
                "--number", "4",
                "--number", "5",
                "--number", "6",
                "--path", "/test/path"
            ],
        })

        expect(typeof res.err).is.equals("object")
        expect(res.err.message).is.equals('Unknown flag: "--port"')
    })

    it("check error on unknown allowed flag", async () => {
        let res = parseCmd({
            cmd: {
                ...execFlagCmd,
                allowUnknownFlags: true,
            },
            args: [
                "--number", "1",
                "--path", "/var/www/html",
                "--path", "/some/new/path",
                "-v",
                "--path", "/some/old/path",
                "--number", "2",
                "--number", "3",
                "--port",
                "--number", "4",
                "--number", "5",
                "--number", "6",
                "--path", "/test/path"
            ],
        })

        expect(exec).is.false
        res = await res.exe()
        expect(exec).is.true

        expect(res.args.length).is.equals(1)
        expect(res.args[0]).is.equals("--port")
        expect(res.err).is.undefined

        expect(res).is.not.undefined
        expect(res.err).is.undefined

        expect(verbose).is.true
        expect(path.length).is.equals(4)
        expect(JSON.stringify(path)).is.equals(JSON.stringify([
            "/var/www/html",
            "/some/new/path",
            "/some/old/path",
            "/test/path"
        ]))
        expect(number.length).is.equals(6)
        expect(JSON.stringify(number)).is.equals(JSON.stringify([
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
        ]))

        expect(res.flags).is.not.undefined
        expect(getType(res.flags)).is.equals("array")
        expect(res.flags.length).is.equals(1)
        expect(res.args.length).is.equals(1)
        expect(res.args[0]).is.equals("--port")

        expect(res.valueFlags).is.not.undefined
        expect(getType(res.valueFlags)).is.equals("object")
        expect(Object.keys(res.valueFlags).length).is.equals(0)

        expect(res.arrayFlags).is.not.undefined
        expect(getType(res.arrayFlags)).is.equals("object")
        expect(Object.keys(res.arrayFlags).length).is.equals(2)
        expect(Object.keys(res.arrayFlags.path).length).is.equals(4)
        expect(JSON.stringify(res.arrayFlags.path)).is.equals(JSON.stringify([
            "/var/www/html",
            "/some/new/path",
            "/some/old/path",
            "/test/path",
        ]))
        expect(Object.keys(res.arrayFlags.number).length).is.equals(6)
        expect(JSON.stringify(res.arrayFlags.number)).is.equals(JSON.stringify([
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
        ]))
    })
})


