import { String } from "ts-toolbelt"

export type Char = string & unknown

export function isChar(
    value: any
): value is Char {
    return typeof value == "string" ||
        value.length == 1
}
export type FirstCharOfString<S extends string> =
    String.Length<S> extends 0 ?
    undefined :
    String.Split<S, "">[0] & Char

export type CharsOfString<S extends string> =
    String.Split<S, ""> & Char[]

export function parseChar<S extends string>(
    str: S,
): FirstCharOfString<S> {
    if (str.length == 0) {
        return undefined as any
    }
    return str.charAt(0) as any
}

export function parseChars<S extends string>(
    str: S
): CharsOfString<S> {
    return str.split("") as any
}

export type FilteredChars = [Char[], string[]]
export function filterChars(arr: string[]): FilteredChars {
    const ret: FilteredChars = [[], []]
    for (const v of arr) {
        if (isChar(v)) {
            ret[0].push(v)
        } else {
            ret[1].push(v)
        }
    }
    return ret
}

export function getCharCode(char: Char): number {
    return char.charCodeAt(0)
}

