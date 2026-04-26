const isDespia = (): boolean =>
    navigator.userAgent.toLowerCase().includes('despia')

function getDespiaGlobal(): any {
    return (window as any).despia
}

function isThenable(v: any): v is PromiseLike<any> {
    return !!v && typeof v === 'object' && typeof v.then === 'function'
}

function isReadyValue(val: any): boolean {
    if (val === undefined || val === 'n/a') return false
    if (Array.isArray(val) && val.length === 0) return false
    if (val && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) return false
    return true
}

// Fire and forget
export function call(scheme: string): void {
    if (!isDespia()) return
    const g = getDespiaGlobal()
    if (typeof g === 'function') {
        g(scheme)
        return
    }
    ;(window as any).despia = scheme
}

// Await a named return value
export function callAwait<T>(scheme: string, key: string): Promise<T> {
    if (!isDespia()) return Promise.resolve(null as unknown as T)
    const g = getDespiaGlobal()

    // If a function bridge exists (like `despia-native`), use it.
    if (typeof g === 'function') {
        const out = g(scheme, [key])
        if (isThenable(out)) return Promise.resolve(out).then((d: any) => d[key] as T)
        return Promise.resolve(null as unknown as T)
    }

    // Setter bridge mode: assign scheme, then wait for `window[key]` to be set by native.
    ;(window as any).despia = scheme
    return new Promise((resolve) => {
        const check = () => {
            const val = (window as any)[key]
            if (isReadyValue(val)) {
                resolve(val as T)
                return
            }
            setTimeout(check, 50)
        }
        check()
    })
}

// Register a window callback. Returns cleanup function. Last registration wins.
export function on(name: string, handler: (data: any) => void): () => void {
    ;(window as any)[name] = handler
    return () => { delete (window as any)[name] }
}
