import assert from "node:assert/strict";
import test from "node:test";

import { MemWalManual } from "../dist/manual.js";

test("MemWalManual.destroy() securely wipes suiPrivateKey and embeddingApiKey from memory (#977)", async () => {
    const callerKey = new Uint8Array(32).fill(42);
    const client = MemWalManual.create({
        key: callerKey,
        suiPrivateKey: "suiprivkey1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq000000",
        embeddingApiKey: "sk-test-secret-embedding-key-12345",
        accountId: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        packageId: "0xabcdef",
        registryId: "0x987654",
        serverUrl: "https://relayer.example",
    });

    // Before destruction, internal config holds credentials
    assert.equal((client).config.suiPrivateKey, "suiprivkey1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq000000");
    assert.equal((client).config.embeddingApiKey, "sk-test-secret-embedding-key-12345");

    client.destroy();

    // After destruction, credential fields are removed from the config object
    assert.equal((client).config.suiPrivateKey, undefined);
    assert.equal((client).config.embeddingApiKey, undefined);
    assert.equal((client).config.key, undefined);

    // Caller's original Uint8Array key must NOT be mutated (#973, #977)
    assert.equal(callerKey.every((b) => b === 42), true);

    // Internal delegatePrivateKey is zeroed
    assert.equal((client).delegatePrivateKey.every((b) => b === 0), true);

    // Client/session caches and keypairs are cleared
    assert.equal((client)._keypair, null);
    assert.equal((client)._suiClient, null);
    assert.equal((client)._sealClient, null);
    assert.equal((client).walletSigner, null);
    assert.equal((client).sessionCache, null);
    assert.equal((client).sessionBuildPromise, null);
});

test("MemWalManual operations on a destroyed client reject immediately (#977)", async () => {
    const callerKey = new Uint8Array(32).fill(7);
    const client = MemWalManual.create({
        key: callerKey,
        suiPrivateKey: "suiprivkey1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq000000",
        embeddingApiKey: "sk-test-key",
        accountId: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        packageId: "0xabcdef",
        registryId: "0x987654",
        serverUrl: "https://relayer.example",
    });

    client.destroy();

    await assert.rejects(
        () => client.rememberManual("test memory"),
        /Walrus Memory client was destroyed; its keys are zeroed\. Create a new one\./
    );

    await assert.rejects(
        () => client.recallManual("test query"),
        /Walrus Memory client was destroyed; its keys are zeroed\. Create a new one\./
    );

    await assert.rejects(
        () => client.restore("default"),
        /Walrus Memory client was destroyed; its keys are zeroed\. Create a new one\./
    );

    await assert.rejects(
        () => client.buildSealSession(),
        /Walrus Memory client was destroyed; its keys are zeroed\. Create a new one\./
    );
});
