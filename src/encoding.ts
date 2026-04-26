export function toB64(data: Uint8Array): string {
    return btoa(String.fromCharCode(...data))
}

export function fromB64(b64: string): Uint8Array {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}
