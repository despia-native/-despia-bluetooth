const isDespia = () => navigator.userAgent.toLowerCase().includes('despia');
function getDespiaGlobal() {
    return window.despia;
}
function isThenable(v) {
    return !!v && typeof v === 'object' && typeof v.then === 'function';
}
function isReadyValue(val) {
    if (val === undefined || val === 'n/a')
        return false;
    if (Array.isArray(val) && val.length === 0)
        return false;
    if (val && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0)
        return false;
    return true;
}
// Fire and forget
export function call(scheme) {
    if (!isDespia())
        return;
    const g = getDespiaGlobal();
    if (typeof g === 'function') {
        g(scheme);
        return;
    }
    ;
    window.despia = scheme;
}
// Await a named return value
export function callAwait(scheme, key) {
    if (!isDespia())
        return Promise.resolve(null);
    const g = getDespiaGlobal();
    // If a function bridge exists (like `despia-native`), use it.
    if (typeof g === 'function') {
        const out = g(scheme, [key]);
        if (isThenable(out))
            return Promise.resolve(out).then((d) => d[key]);
        return Promise.resolve(null);
    }
    // Setter bridge mode: assign scheme, then wait for `window[key]` to be set by native.
    ;
    window.despia = scheme;
    return new Promise((resolve) => {
        const check = () => {
            const val = window[key];
            if (isReadyValue(val)) {
                resolve(val);
                return;
            }
            setTimeout(check, 50);
        };
        check();
    });
}
// Register a window callback. Returns cleanup function. Last registration wins.
export function on(name, handler) {
    ;
    window[name] = handler;
    return () => { delete window[name]; };
}
