export const exampleRules = [
    "test.com=STATIC:/var/www/test",
    "example.com=PROXY:example_nginx:18080",
    "majo.test.com=REDIRECT:github.com/majo418",
    "sysdev.test.com=REDIRECT:github.com/sysdev",
    "*=PROXY:https://nginx_test:8080",
    "*.example.com=STATIC:/var/www/html",
    "*.redirect.com=REDIRECT:https://test.test.com",
    "*.test.com=STATIC:/var/www/test",
]

export function clearEnvironment(prefix: string): void {
    for (let index = 1; true; index++) {
        const value = process.env[prefix + index]
        if (!value) {
            break;
        }
        delete process.env[prefix + index]
    }
}

export function setEnvironment(prefix: string, values: string[]): void {
    values.forEach((value, i) => {
        process.env[prefix + (i + 1)] = value
    })
}

export function uniqueStringify(value: any): string {
    return JSON.stringify(value, null, 4)
}