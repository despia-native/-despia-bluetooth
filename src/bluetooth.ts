import { call, callAwait, on } from './bridge'
import { toB64, fromB64 } from './encoding'
import type {
    ScanOptions, ConnectOptions, SubscribeOptions,
    BleDevice, BleService, BleConnectEvent, BleDataEvent, BleStateEvent
} from './types'

const isDespia = (): boolean =>
    typeof navigator !== 'undefined' &&
    typeof navigator.userAgent === 'string' &&
    navigator.userAgent.toLowerCase().includes('despia')

export class BluetoothClient {

    // ── State ─────────────────────────────────────────────────────────

    async getState(): Promise<string> {
        if (!isDespia()) return ''
        return callAwait<any>('bluetooth://state', 'bleState').then(d => d.state)
    }

    onStateChange(cb: (event: BleStateEvent) => void): () => void {
        return on('onBleState', cb)
    }

    // ── Scan ──────────────────────────────────────────────────────────

    async startScan(opts: ScanOptions): Promise<void> {
        on('onBleDevice', (raw: any) => opts.onDevice({
            ...raw,
            manufacturerData: raw.manufacturerData ? fromB64(raw.manufacturerData) : null
        } as BleDevice))
        const p = new URLSearchParams()
        if (opts.services?.length) p.set('services', opts.services.join(','))
        if (opts.duration)         p.set('duration', String(opts.duration))
        call(`bluetooth://scan?${p}`)
    }

    async stopScan(): Promise<void> {
        call('bluetooth://stopscan')
    }

    onScanEnd(cb: () => void): () => void {
        return on('onBleScanEnd', cb)
    }

    // ── Connect ───────────────────────────────────────────────────────

    async connect(id: string, opts: ConnectOptions = {}): Promise<void> {
        if (!isDespia()) return
        return new Promise((resolve, reject) => {
            const cleanup = on('onBleConnect', (e: BleConnectEvent) => {
                if (e.id !== id) return
                cleanup()
                e.state === 'connected' ? resolve() : reject(new Error(e.error ?? `Connection ${e.state}`))
            })
            const p = new URLSearchParams({ id })
            if (opts.timeout)     p.set('timeout', String(opts.timeout))
            if (opts.autoConnect) p.set('autoConnect', 'true')
            if (opts.server)      p.set('server', opts.server)
            call(`bluetooth://connect?${p}`)
        })
    }

    async disconnect(id: string): Promise<void> {
        call(`bluetooth://disconnect?id=${encodeURIComponent(id)}`)
    }

    onConnect(cb: (e: BleConnectEvent) => void): () => void {
        return on('onBleConnect', cb)
    }

    // ── Discover ──────────────────────────────────────────────────────

    async discover(id: string): Promise<BleService[]> {
        if (!isDespia()) return []
        return new Promise(resolve => {
            const cleanup = on('onBleDiscovered', (e: any) => {
                if (e.id !== id) return
                cleanup()
                resolve(e.services as BleService[])
            })
            call(`bluetooth://discover?id=${encodeURIComponent(id)}`)
        })
    }

    // ── Read ──────────────────────────────────────────────────────────

    async read(id: string, service: string, char: string): Promise<Uint8Array> {
        if (!isDespia()) return new Uint8Array()
        return new Promise(resolve => {
            const cleanup = on('onBleData', (e: any) => {
                if (e.id !== id || e.char !== char || e.source !== 'read') return
                cleanup()
                resolve(fromB64(e.value))
            })
            call(`bluetooth://read?${new URLSearchParams({ id, service, char })}`)
        })
    }

    // ── Write ─────────────────────────────────────────────────────────

    async write(id: string, service: string, char: string, data: Uint8Array): Promise<void> {
        if (!isDespia()) return
        return new Promise((resolve, reject) => {
            const cleanup = on('onBleWriteComplete', (e: any) => {
                if (e.id !== id || e.char !== char) return
                cleanup()
                e.success ? resolve() : reject(new Error(e.error))
            })
            call(`bluetooth://write?${new URLSearchParams({
                id, service, char, value: toB64(data), withResponse: 'true'
            })}`)
        })
    }

    async writeWithoutResponse(id: string, service: string, char: string, data: Uint8Array): Promise<void> {
        call(`bluetooth://write?${new URLSearchParams({
            id, service, char, value: toB64(data), withResponse: 'false'
        })}`)
    }

    // ── Subscribe ─────────────────────────────────────────────────────

    async subscribe(id: string, service: string, char: string,
        opts: SubscribeOptions): Promise<() => void> {
        if (!isDespia()) return () => {}
        on('onBleData', (e: any) => {
            if (e.id !== id || e.char !== char || e.source !== 'notification') return
            opts.onData(fromB64(e.value))
        })
        const p = new URLSearchParams({ id, service, char })
        if (opts.server) p.set('server', opts.server)
        call(`bluetooth://subscribe?${p}`)
        return () => call(`bluetooth://unsubscribe?${new URLSearchParams({ id, service, char })}`)
    }

    // ── RSSI ──────────────────────────────────────────────────────────

    async readRssi(id: string): Promise<number> {
        if (!isDespia()) return 0
        return new Promise(resolve => {
            const cleanup = on('onBleRssi', (e: any) => {
                if (e.id !== id) return
                cleanup()
                resolve(e.rssi as number)
            })
            call(`bluetooth://rssi?id=${encodeURIComponent(id)}`)
        })
    }

    // ── Background replay ─────────────────────────────────────────────

    onEvent(cb: (e: BleDataEvent | BleConnectEvent) => void): () => void {
        return on('onBleEvent', (raw: any) => {
            if (raw.value) raw.value = fromB64(raw.value)
            cb(raw)
        })
    }

    // ── Raw escape hatch ──────────────────────────────────────────────

    async raw(id: string, payload: Uint8Array): Promise<Uint8Array> {
        if (!isDespia()) return new Uint8Array()
        return new Promise(resolve => {
            const cleanup = on('onBleRaw', (e: any) => {
                if (e.id !== id) return
                cleanup()
                resolve(fromB64(e.payload))
            })
            call(`bluetooth://raw?${new URLSearchParams({ id, payload: toB64(payload) })}`)
        })
    }
}

export const bluetooth = new BluetoothClient()

