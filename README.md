# `@despia/bluetooth`

[![GitHub Repository](https://img.shields.io/badge/GitHub-despia--native%2F--despia--bluetooth-181717?logo=github)](https://github.com/despia-native/-despia-bluetooth)

> **Note (pre-release / limited access)**  
> This package is **only meant for Despia’s internal QA team and selected users** while the Bluetooth bridge is still in development. It will be **re-released for the general public in the near future**.

Typed, Promise-based Bluetooth SDK for the Despia runtime.

- **Typed API**: strong TypeScript types for devices, services, and events
- **Async-first**: `async/await` for scan/connect/read/write
- **Binary in/out**: callers use `Uint8Array`; Base64 is handled internally
- **Safe outside Despia**: when `navigator.userAgent` does not include `"despia"`, calls silently no-op (no errors thrown)

## Requirements

- Works inside the Despia runtime (where `window.despia` is available)
- Bluetooth must be enabled in Despia: `Despia > App > Addons > Bluetooth`
- In normal browsers and local web dev, calls silently no-op so you can run the same code safely

## Install

This package expects the Despia runtime bridge as a peer dependency:

```bash
npm install @despia/bluetooth
```

```bash
pnpm add @despia/bluetooth
```

## CDN

If you are running inside Despia and want to import from a CDN (instead of bundling), you can use the ESM build in `dist/index.js`:

```html
<script type="module">
  import { bluetooth } from "https://unpkg.com/@despia/bluetooth@latest/dist/index.js";

  bluetooth.onStateChange((e) => console.log("ble state", e.state));
</script>
```

## Quick start (scan, connect, discover)

```ts
import { bluetooth } from '@despia/bluetooth'

await bluetooth.startScan({
  services: ['0000180D-0000-1000-8000-00805F9B34FB'],
  onDevice: async (device) => {
    await bluetooth.stopScan()
    await bluetooth.connect(device.id, { autoConnect: true })

    const services = await bluetooth.discover(device.id)
    console.log('Discovered services:', services)
  }
})
```

## Common workflow (device picker)

For a good UX, collect devices during scanning, render a list, and connect to the one the user selects.

```ts
import { bluetooth } from '@despia/bluetooth'
import type { BleDevice } from '@despia/bluetooth'

const devicesById = new Map<string, BleDevice>()

await bluetooth.startScan({
  onDevice: (d) => {
    devicesById.set(d.id, d)
    // Render `Array.from(devicesById.values())` in your UI picker
  }
})
```

## Finding service and characteristic UUIDs (without docs)

The `services: [...]` filter is a list of Bluetooth service UUIDs (strings).

Where UUIDs come from:

- **Standard services**: Bluetooth SIG publishes official UUIDs for common profiles (Heart Rate is `0000180D-0000-1000-8000-00805F9B34FB`, often shown as `0x180D`).
- **Vendor services**: device makers define their own 128-bit UUIDs in their documentation or SDK.

Practical steps:

- **Scan and log advertised services** (fast, does not require connecting)

```ts
import { bluetooth } from '@despia/bluetooth'

await bluetooth.startScan({
  onDevice: (d) => {
    console.log('device', d.name, d.id)
    console.log('advertised services', d.services)
  }
})
```

If you do not have manufacturer docs, a QA-friendly approach is to show a popup for the first device you see and copy values from the alert. This example intentionally stops scanning on the first `onDevice` callback, so you only get one device in the popup.

```ts
import { bluetooth } from '@despia/bluetooth'

await bluetooth.startScan({
  onDevice: async (d) => {
    await bluetooth.stopScan()
    const services = d.services.length ? d.services.join('\n') : '(none)'
    alert(
      `Device found\n\n` +
      `Name: ${d.name ?? '(unnamed)'}\n` +
      `ID: ${d.id}\n\n` +
      `Advertised services:\n${services}`
    )
  }
})
```

- **Connect and run GATT discovery** (most reliable list of services and characteristics)

```ts
import { bluetooth } from '@despia/bluetooth'

await bluetooth.connect(deviceId)
const services = await bluetooth.discover(deviceId)

for (const s of services) {
  console.log('service', s.uuid)
  for (const c of s.characteristics) {
    console.log('  char', c.uuid, 'props', c.properties)
  }
}
```

## Permissions

If the native layer reports that Bluetooth permission is denied, it will surface via the `onBleState` callback as `{ state: 'unauthorized' }`:

```ts
import { bluetooth } from '@despia/bluetooth'

bluetooth.onStateChange(({ state }) => {
  if (state === 'unauthorized') {
    alert('Bluetooth permission denied')
  }
})
```

If you prefer a per-call check (instead of relying on a global listener), use `getState()` before scanning or connecting:

```ts
import { bluetooth } from '@despia/bluetooth'

async function assertBleAuthorized(): Promise<void> {
  const state = await bluetooth.getState()
  if (state === 'unauthorized') throw new Error('Bluetooth permission denied')
  if (state === 'off') throw new Error('Bluetooth is off')
  if (state === 'unsupported') throw new Error('Bluetooth unsupported')
}

await assertBleAuthorized()
await bluetooth.startScan({
  onDevice: (d) => console.log('device', d.name, d.id)
})
```

## Scan filter

You only pass an array of UUID strings to `startScan`. You do not need to build or maintain any scheme strings yourself.

The SDK constructs the scheme call internally and forwards it to native.

## Read and write

```ts
import { bluetooth } from '@despia/bluetooth'

await bluetooth.connect(deviceId)

const value = await bluetooth.read(deviceId, serviceUUID, charUUID)
console.log('Read bytes:', value) // Uint8Array

await bluetooth.write(deviceId, serviceUUID, charUUID, new Uint8Array([0x01, 0x02, 0x03]))
```

## Subscribe to notifications

```ts
import { bluetooth } from '@despia/bluetooth'

await bluetooth.connect(deviceId)

const unsubscribe = await bluetooth.subscribe(deviceId, serviceUUID, charUUID, {
  onData: (data) => {
    console.log('Notification bytes:', data) // Uint8Array
  }
})

// later...
unsubscribe()
```

## Background event replay

Despia may replay events that fired while the app was closed:

```ts
import { bluetooth } from '@despia/bluetooth'

bluetooth.onEvent((event) => {
  if (event.background && 'value' in event) {
    // event.value is Uint8Array for data events
    console.log('Replayed event:', event.timestamp, event.value)
  }
})
```

## Raw escape hatch

```ts
import { bluetooth } from '@despia/bluetooth'

const response = await bluetooth.raw(deviceId, new Uint8Array([0xAA, 0x01, 0xFF]))
console.log('Vendor response:', response) // Uint8Array
```

## API reference

- **State**
  - `bluetooth.getState(): Promise<string>`
  - `bluetooth.onStateChange(cb): () => void`
- **Scan**
  - `bluetooth.startScan(opts): Promise<void>`
  - `bluetooth.stopScan(): Promise<void>`
  - `bluetooth.onScanEnd(cb): () => void`
- **Connection**
  - `bluetooth.connect(id, opts?): Promise<void>`
  - `bluetooth.disconnect(id): Promise<void>`
  - `bluetooth.onConnect(cb): () => void`
- **GATT**
  - `bluetooth.discover(id): Promise<BleService[]>`
  - `bluetooth.read(id, service, char): Promise<Uint8Array>`
  - `bluetooth.write(id, service, char, data): Promise<void>`
  - `bluetooth.writeWithoutResponse(id, service, char, data): Promise<void>`
  - `bluetooth.subscribe(id, service, char, opts): Promise<() => void>`
  - `bluetooth.readRssi(id): Promise<number>`
- **Events / Raw**
  - `bluetooth.onEvent(cb): () => void`
  - `bluetooth.raw(id, payload): Promise<Uint8Array>`

## Behavior outside Despia

If `navigator.userAgent` does not include `"despia"`, the native bridge is not invoked:

- Scheme calls become **no-ops** (nothing is sent to native).
- Promise-based methods return immediately with safe empty values (so they don’t hang in browser dev).
- No errors are thrown.

## Development

```bash
npm test
npm run build
```

