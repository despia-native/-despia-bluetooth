import { call, callAwait, on } from './bridge';
import { toB64, fromB64 } from './encoding';
const isDespia = () => typeof navigator !== 'undefined' &&
    typeof navigator.userAgent === 'string' &&
    navigator.userAgent.toLowerCase().includes('despia');
export class BluetoothClient {
    // ── State ─────────────────────────────────────────────────────────
    async getState() {
        return callAwait('bluetooth://state', 'bleState').then(d => d.state);
    }
    onStateChange(cb) {
        return on('onBleState', cb);
    }
    // ── Scan ──────────────────────────────────────────────────────────
    async startScan(opts) {
        var _a;
        on('onBleDevice', (raw) => opts.onDevice({
            ...raw,
            manufacturerData: raw.manufacturerData ? fromB64(raw.manufacturerData) : null
        }));
        const p = new URLSearchParams();
        if ((_a = opts.services) === null || _a === void 0 ? void 0 : _a.length)
            p.set('services', opts.services.join(','));
        if (opts.duration)
            p.set('duration', String(opts.duration));
        call(`bluetooth://scan?${p}`);
    }
    async stopScan() {
        call('bluetooth://stopscan');
    }
    onScanEnd(cb) {
        return on('onBleScanEnd', cb);
    }
    // ── Connect ───────────────────────────────────────────────────────
    async connect(id, opts = {}) {
        if (!isDespia())
            return;
        return new Promise((resolve, reject) => {
            const cleanup = on('onBleConnect', (e) => {
                var _a;
                if (e.id !== id)
                    return;
                cleanup();
                e.state === 'connected' ? resolve() : reject(new Error((_a = e.error) !== null && _a !== void 0 ? _a : `Connection ${e.state}`));
            });
            const p = new URLSearchParams({ id });
            if (opts.timeout)
                p.set('timeout', String(opts.timeout));
            if (opts.autoConnect)
                p.set('autoConnect', 'true');
            if (opts.server)
                p.set('server', opts.server);
            call(`bluetooth://connect?${p}`);
        });
    }
    async disconnect(id) {
        call(`bluetooth://disconnect?id=${encodeURIComponent(id)}`);
    }
    onConnect(cb) {
        return on('onBleConnect', cb);
    }
    // ── Discover ──────────────────────────────────────────────────────
    async discover(id) {
        if (!isDespia())
            return [];
        return new Promise(resolve => {
            const cleanup = on('onBleDiscovered', (e) => {
                if (e.id !== id)
                    return;
                cleanup();
                resolve(e.services);
            });
            call(`bluetooth://discover?id=${encodeURIComponent(id)}`);
        });
    }
    // ── Read ──────────────────────────────────────────────────────────
    async read(id, service, char) {
        if (!isDespia())
            return new Uint8Array();
        return new Promise(resolve => {
            const cleanup = on('onBleData', (e) => {
                if (e.id !== id || e.char !== char || e.source !== 'read')
                    return;
                cleanup();
                resolve(fromB64(e.value));
            });
            call(`bluetooth://read?${new URLSearchParams({ id, service, char })}`);
        });
    }
    // ── Write ─────────────────────────────────────────────────────────
    async write(id, service, char, data) {
        if (!isDespia())
            return;
        return new Promise((resolve, reject) => {
            const cleanup = on('onBleWriteComplete', (e) => {
                if (e.id !== id || e.char !== char)
                    return;
                cleanup();
                e.success ? resolve() : reject(new Error(e.error));
            });
            call(`bluetooth://write?${new URLSearchParams({
                id, service, char, value: toB64(data), withResponse: 'true'
            })}`);
        });
    }
    async writeWithoutResponse(id, service, char, data) {
        call(`bluetooth://write?${new URLSearchParams({
            id, service, char, value: toB64(data), withResponse: 'false'
        })}`);
    }
    // ── Subscribe ─────────────────────────────────────────────────────
    async subscribe(id, service, char, opts) {
        if (!isDespia())
            return () => { };
        on('onBleData', (e) => {
            if (e.id !== id || e.char !== char || e.source !== 'notification')
                return;
            opts.onData(fromB64(e.value));
        });
        const p = new URLSearchParams({ id, service, char });
        if (opts.server)
            p.set('server', opts.server);
        call(`bluetooth://subscribe?${p}`);
        return () => call(`bluetooth://unsubscribe?${new URLSearchParams({ id, service, char })}`);
    }
    // ── RSSI ──────────────────────────────────────────────────────────
    async readRssi(id) {
        if (!isDespia())
            return 0;
        return new Promise(resolve => {
            const cleanup = on('onBleRssi', (e) => {
                if (e.id !== id)
                    return;
                cleanup();
                resolve(e.rssi);
            });
            call(`bluetooth://rssi?id=${encodeURIComponent(id)}`);
        });
    }
    // ── Background replay ─────────────────────────────────────────────
    onEvent(cb) {
        return on('onBleEvent', (raw) => {
            if (raw.value)
                raw.value = fromB64(raw.value);
            cb(raw);
        });
    }
    // ── Raw escape hatch ──────────────────────────────────────────────
    async raw(id, payload) {
        if (!isDespia())
            return new Uint8Array();
        return new Promise(resolve => {
            const cleanup = on('onBleRaw', (e) => {
                if (e.id !== id)
                    return;
                cleanup();
                resolve(fromB64(e.payload));
            });
            call(`bluetooth://raw?${new URLSearchParams({ id, payload: toB64(payload) })}`);
        });
    }
}
export const bluetooth = new BluetoothClient();
