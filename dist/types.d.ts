export interface BleDevice {
    id: string;
    name: string | null;
    rssi: number;
    services: string[];
    manufacturerData: Uint8Array | null;
    isConnectable: boolean;
}
export interface BleService {
    uuid: string;
    characteristics: BleCharacteristic[];
}
export interface BleCharacteristic {
    uuid: string;
    properties: ('read' | 'write' | 'writeNoResponse' | 'notify' | 'indicate')[];
}
export interface BleDataEvent {
    id: string;
    service: string;
    char: string;
    value: Uint8Array;
    source: 'notification' | 'read';
    background: boolean;
    timestamp: number;
}
export interface BleConnectEvent {
    id: string;
    state: 'connected' | 'disconnected' | 'failed';
    background: boolean;
    error?: string;
}
export interface BleStateEvent {
    state: 'on' | 'off' | 'unauthorized' | 'unsupported';
}
export interface ScanOptions {
    services?: string[];
    duration?: number;
    onDevice: (device: BleDevice) => void;
}
export interface ConnectOptions {
    timeout?: number;
    autoConnect?: boolean;
    server?: string;
}
export interface SubscribeOptions {
    onData: (data: Uint8Array) => void;
    server?: string;
}
