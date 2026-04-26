import { describe, expect, test } from 'vitest'

// vitest runs in Node by default; `encoding.ts` is locked to `btoa/atob`.
if (typeof (globalThis as any).btoa !== 'function') {
    ;(globalThis as any).btoa = (s: string) => Buffer.from(s, 'binary').toString('base64')
}
if (typeof (globalThis as any).atob !== 'function') {
    ;(globalThis as any).atob = (b64: string) => Buffer.from(b64, 'base64').toString('binary')
}

import { fromB64, toB64 } from '../src/encoding'

describe('encoding', () => {
    test('round-trip', () => {
        const data = new Uint8Array([0x10, 0x20, 0x30, 0xFF, 0x00])
        expect(fromB64(toB64(data))).toEqual(data)
    })

    test('empty array', () => {
        const data = new Uint8Array([])
        expect(fromB64(toB64(data))).toEqual(data)
    })

    test('known bytes [0x01, 0x02, 0x03]', () => {
        const data = new Uint8Array([0x01, 0x02, 0x03])
        expect(fromB64(toB64(data))).toEqual(data)
    })
})

