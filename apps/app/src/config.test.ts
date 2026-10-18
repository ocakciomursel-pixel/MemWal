import { describe, expect, it } from 'vitest'
import {
    config,
    DEFAULT_MAINNET_PACKAGE_ID,
    DEFAULT_MAINNET_REGISTRY_ID,
    DEFAULT_TESTNET_PACKAGE_ID,
    DEFAULT_TESTNET_REGISTRY_ID,
} from './config'

describe('config default package/registry IDs', () => {
    it('defines distinct mainnet and testnet package and registry IDs matching deployment cutover', () => {
        expect(DEFAULT_MAINNET_PACKAGE_ID).toBe('0xe7c16fbea0560e7057e2bf7422feaa4fb313749fc69c9e9092fac7a33b81d7f5')
        expect(DEFAULT_MAINNET_REGISTRY_ID).toBe('0x8bf82c9e09e36b8d1c38298f68b7cb68e7b8762887e7592add9986d5e9cf199f')
        expect(DEFAULT_TESTNET_PACKAGE_ID).toBe('0x0a625e2db2af6f591a4c80a3d8551ddf11656089cc3a20c5e9e7f8fb75b9265c')
        expect(DEFAULT_TESTNET_REGISTRY_ID).toBe('0x736aef9906798fca4460490ccdf8e8502ef170122dc26ecae32111b78c6b42dd')
    })

    it('exports a valid configuration object with non-empty package and registry IDs', () => {
        expect(config.memwalPackageId).toBeTruthy()
        expect(config.memwalRegistryId).toBeTruthy()
        expect(config.memwalPackageId.startsWith('0x')).toBe(true)
        expect(config.memwalRegistryId.startsWith('0x')).toBe(true)
    })
})
