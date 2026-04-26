import type { ScanOptions, ConnectOptions, SubscribeOptions, BleService, BleConnectEvent, BleDataEvent, BleStateEvent } from './types';
export declare class BluetoothClient {
    getState(): Promise<string>;
    onStateChange(cb: (event: BleStateEvent) => void): () => void;
    startScan(opts: ScanOptions): Promise<void>;
    stopScan(): Promise<void>;
    onScanEnd(cb: () => void): () => void;
    connect(id: string, opts?: ConnectOptions): Promise<void>;
    disconnect(id: string): Promise<void>;
    onConnect(cb: (e: BleConnectEvent) => void): () => void;
    discover(id: string): Promise<BleService[]>;
    read(id: string, service: string, char: string): Promise<Uint8Array>;
    write(id: string, service: string, char: string, data: Uint8Array): Promise<void>;
    writeWithoutResponse(id: string, service: string, char: string, data: Uint8Array): Promise<void>;
    subscribe(id: string, service: string, char: string, opts: SubscribeOptions): Promise<() => void>;
    readRssi(id: string): Promise<number>;
    onEvent(cb: (e: BleDataEvent | BleConnectEvent) => void): () => void;
    raw(id: string, payload: Uint8Array): Promise<Uint8Array>;
}
export declare const bluetooth: BluetoothClient;
