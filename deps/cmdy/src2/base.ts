export type Awaitable<T> = PromiseLike<T> | Promise<T> | T

export type ExtractTail<T extends any[]> = T extends [infer _, ...infer Tail] ? Tail : undefined
export type OrEach<T extends any[]> = T[number]
export interface GenObject<V> {
    [key: string]: V
}

export type KeysOfObjectFunc = <O extends GenObject<any>>(
    obj: O
) => Array<keyof O>
export const getKeysOfObj: KeysOfObjectFunc =
    Object.keys as any

export type GetKeyOfObjFunc = <O extends GenObject<any>, S extends string>(
    obj: O,
    key: S
) => O[S] | undefined
export const getKeyOfObj: GetKeyOfObjFunc =
    (obj, key) => obj[key]

export function splitArrayByFirst(
    arr: string[],
    value: string,
    flipIfMissing: boolean = false,
): [string[], string[]] {
    const index = arr.indexOf(value)
    if (index == -1) {
        if (flipIfMissing) {
            return [
                arr,
                [],
            ]
        } else {
            return [
                [],
                arr,
            ]
        }
    }
    return [
        arr.slice(index),
        arr.slice(index + 1),
    ]
}
