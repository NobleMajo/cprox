import { Flag, parseCmd, CmdDefinition, CmdError } from "../src/index"

const force: Flag = {
    name: "force",
    description: "The force flag",
}

const port: Flag = {
    name: "port",
    description: "The port flag",
    shorthand: "p",
    types: ["number"]
}

const publish: Flag = {
    name: "publish",
    description: "The publish flag",
    shorthand: "P",
    types: ["string"]
}

const volume: Flag = {
    name: "volume",
    description: "The volume flag",
    shorthand: "v",
    types: ["string"]
}

const removeF: Flag = {
    name: "remove",
    description: "The remove flag",
    alias: ["rm"],
}

const verbose: Flag = {
    name: "verbose",
    description: "The verbose flag",
    shorthand: "V",
}

const version: Flag = {
    name: "version",
    description: "The verbose flag",
    alias: ["v", "ve", "ver", "vers", "versi", "versio"],
    shorthand: "v",
}

const run: CmdDefinition = {
    name: "run",
    description: "The run command",
    group: "management",
    flags: [
        removeF,
        publish,
        volume,
        port
    ],
    allowUnknownArgs: true,
    exe: async (res) => console.log("cmd: ", res.cmd.name + "\nres-data:\n", res.flags, res.valueFlags)
}

const start: CmdDefinition = {
    name: "start",
    description: "The start command",
    group: "management",
    flags: [
        removeF,
        port
    ],
    exe: async (res) => console.log("cmd: ", res.cmd.name + "\nres-data:\n", res.flags, res.valueFlags)
}

const create: CmdDefinition = {
    name: "create",
    description: "The create command",
    group: "management",
    flags: [
        volume,
        publish,
        removeF
    ],
    exe: async (res) => console.log("cmd: ", res.cmd.name + "\nres-data:\n", res.flags, res.valueFlags)
}

const remove: CmdDefinition = {
    name: "remove",
    description: "The remove command",
    group: "management",
    flags: [
        force
    ],
    exe: async (res) => console.log("cmd: ", res.cmd.name + "\nres-data:\n", res.flags, res.valueFlags)
}

const stop: CmdDefinition = {
    name: "stop",
    description: "The stop command",
    group: "management",
    flags: [
        force
    ],
    exe: async (res) => console.log("cmd: ", res.cmd.name + "\nres-data:\n", res.flags, res.valueFlags)
}

const search: CmdDefinition = {
    name: "search",
    description: "The search command",
    flags: [
    ],
    exe: async (res) => console.log("cmd: ", res.cmd.name + "\nres-data:\n", res.flags, res.valueFlags)
}

const wait: CmdDefinition = {
    name: "wait",
    description: "The wait command",
    flags: [
    ],
    exe: async (res) => console.log("cmd: ", res.cmd.name + "\nres-data:\n", res.flags, res.valueFlags)
}

const events: CmdDefinition = {
    name: "events",
    description: "The wait command",
    flags: [
    ],
    exe: async (res) => console.log("cmd: ", res.cmd.name + "\nres-data:\n", res.flags, res.valueFlags)
}

const root: CmdDefinition = {
    name: "docker",
    description: "The root docker command",
    cmds: [
        run,
        start,
        stop,
        create,
        remove,
        events,
        wait,
        search
    ],
    //exe: async () => console.log("asdasdd")
}

parseCmd({
    cmd: root,
    globalFlags: [
        verbose,
        version
    ]
}).exe()
