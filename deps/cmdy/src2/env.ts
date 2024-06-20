import { JsonType } from "./json"
import { String } from "ts-toolbelt"

export interface TypeConifg {
    [key: string]: TypeCheckFunc<any>
}

export const test: any = {
    "verbose": "boolean",
    "port": "number",

}

