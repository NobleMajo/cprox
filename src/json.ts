export function removeCircularObjects(
    value: any,
    objects: object[] = []
): {
    value: any,
    objects: object[],
} {
    if (typeof value == "object") {
        if (value != null) {
            if (objects.includes(value)) {
                value = "CircularObject[" + objects.indexOf(value) + "]"
            } else {
                objects.push(value)
                if (Array.isArray(value)) {
                    value = value.map((v) => removeCircularObjects(v, objects))
                } else {
                    const value2: { [key: string]: any } = {}
                    for (const key of Object.keys(value)) {
                        value2[key] = removeCircularObjects(value[key], objects)
                    }
                    value = value2
                }
            }
        }
    }
    return {
        value: value,
        objects: objects
    }
}

export function uniqueStringify(value: any): string {
    return JSON.stringify(removeCircularObjects(value).value, null, 4)
}