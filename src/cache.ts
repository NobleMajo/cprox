

export interface CacheEntry<T> {
    expiresAt: number,
    value: any,
    onExpire: ((value: T, cache: CacheHolder) => Promise<void> | void) | undefined
}

export class CacheHolder {
    private cache: { [key: string]: CacheEntry<any> } = {}
    private checkInterval: NodeJS.Timer | undefined

    public get<T>(key: string): T {
        return this.cache[key].value
    }

    public set<T>(
        key: string,
        value: T,
        expireMillis: number = 1000 * 60 * 5,
        onExpire: ((value: T, cache: CacheHolder) => Promise<void> | void) | undefined = undefined
    ): void {
        this.cache[key] = {
            value: value,
            expiresAt: Date.now() + expireMillis,
            onExpire: onExpire
        }
    }

    public has(key: string): boolean {
        return this.cache[key] != undefined
    }

    public remove(key: string): void {
        delete this.cache[key]
    }

    public clear(): void {
        this.cache = {}
    }

    public isExpired(key: string): boolean {
        return this.cache[key].expiresAt < Date.now()
    }

    public getExpiry(key: string): number {
        return this.cache[key].expiresAt
    }

    public checkExpiry(): Promise<void> {
        const keys = Object.keys(this.cache)
        const promises: Promise<void>[] = []
        for (let index = 0; index < keys.length; index++) {
            const key = keys[index]
            if (this.isExpired(key)) {
                const entry = this.cache[key]
                if (entry.onExpire) {
                    const promise = entry.onExpire(entry.value, this)
                    if (promise) {
                        promises.push(promise)
                    }
                }
                this.remove(key)
            }
        }
        return Promise.all(promises).then()
    }

    public stopCheckInterval(): void {
        if (!this.checkInterval) {
            return
        }
        clearInterval(this.checkInterval)
        this.checkInterval = undefined
    }

    public startCheckInterval(
        intervalMillis: number = 1000 * 30,
        checkCallback: (promise: Promise<void>) => any
    ): void {
        this.stopCheckInterval()
        this.checkInterval = setInterval(
            () => checkCallback(this.checkExpiry()),
            intervalMillis
        )
    }
}

