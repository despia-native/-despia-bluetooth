export function toB64(data) {
    return btoa(String.fromCharCode(...data));
}
export function fromB64(b64) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}
