import { Rule } from './rule';
import { toAbsolutePath } from "majotools/dist/fs"
import { Resolver } from "./resolver"

export abstract class RuleModule {
    abstract parse(rawRule: Rule): Resolver
}

export function loadRuleModule(
    name: string,
    moduleDirs: string[]
): RuleModule {
    if (moduleDirs.length == 0) {
        throw new Error("No module dir defined")
    }
    for (const dir of moduleDirs) {
        const modulePath = toAbsolutePath(name, dir)
        let exports: any = undefined
        try {
            exports = require(modulePath + ".ts")
        } catch (err) {
            try {
                exports = require(modulePath)
            } catch (err) {
                try {
                    exports = require(modulePath + ".js")
                } catch (err) {
                }
            }
        }
        if (!exports) {
            continue
        }
        if (typeof exports.default != "object") {
            throw new Error("Module file '" + moduleDirs + "' has not default object export")
        } else if (exports.default == null) {
            throw new Error("Module file '" + moduleDirs + "' has 'null' as default object export")
        } else if (Array.isArray(exports.default)) {
            throw new Error("Module file '" + moduleDirs + "' has an array as default object export")
        }
        const module = exports.default as RuleModule
        if (!(module instanceof RuleModule)) {
            throw new Error("Module at '" + modulePath + "' is not instance of 'RuleModule' class")
        } else if (typeof module.check == "function") {
            throw new Error("Module at '" + modulePath + "' has not check function")
        } else if (typeof module.parse == "function") {
            throw new Error("Module at '" + modulePath + "' has not parse function")
        }
        return module
    }
    throw new Error("Module with name '" + name + "' not found")
}