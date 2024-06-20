export type JsonBaseType = string | number | boolean | null
export type JsonType = JsonHolder | JsonBaseType
export type JsonHolder = JsonObject | JsonArray
export type JsonArray = JsonType[]
export interface JsonObject {
    [key: string]: JsonType
}
