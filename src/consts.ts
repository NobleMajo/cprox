
export interface RequestData {
    host: string,
    path: string,
    hostParts: string[],
    pathParts: string[],
}

export const domainRegex = /^(?!-)[A-Za-z0-9-]+([\-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/g
export const domainWildcardRegex = /^(?!-)[A-Za-z0-9*-]+([\-\.]{1}[a-z0-9*]+)*\.[A-Za-z*]{2,6}$/g
export const ipv4Regex = /^([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\\.([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\\.([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\\.([01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])$/g
export const ipv6Regex = /^((?:[0-9A-Fa-f]{1,4}))((?::[0-9A-Fa-f]{1,4}))*::((?:[0-9A-Fa-f]{1,4}))((?::[0-9A-Fa-f]{1,4}))*|((?:[0-9A-Fa-f]{1,4}))((?::[0-9A-Fa-f]{1,4})){7}$/g

export function parseRequestUrl(
    host: string,
    path: string,
): RequestData {
    let hostParts: string[]
    if (host.startsWith("[")) {
        let portSeperatorIndex = host.lastIndexOf("]:")
        if (portSeperatorIndex > 0) {
            host = host.substring(1, portSeperatorIndex)
        } else if (host.endsWith("]")) {
            host = host.slice(1, -1)
        }
        if (!ipv6Regex.test(host)) {
            hostParts = [host]
        }
        hostParts = host.split(".").reverse()
    } else {
        let portSeperatorIndex = host.lastIndexOf(":")
        if (portSeperatorIndex > 0) {
            host = host.substring(0, portSeperatorIndex)
        }
        if (ipv4Regex.test(host)) {
            hostParts = [host]
        } else {
            hostParts = host.split(".").reverse()
        }
    }

    let pathParts: string[] = path.split("/")
    if (pathParts[0] == "") {
        pathParts.shift()
    }
    return {
        host: host,
        path: path,
        hostParts: hostParts,
        pathParts: pathParts,
    }
}
