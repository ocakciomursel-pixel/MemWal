import assert from "node:assert/strict";
import test from "node:test";

import { MemWal } from "../dist/memwal.js";
import { validateVector } from "../dist/index.js";

const originalFetch = globalThis.fetch;

test.afterEach(() => {
    globalThis.fetch = originalFetch;
});

function client() {
    return MemWal.create({
        key: "11".repeat(32),
        accountId: "0x1",
        serverUrl: "https://relayer.example",
    });
}

test("validateVector rejects invalid inputs", () => {
    // Non-array
    assert.throws(() => validateVector(null), {
        name: "TypeError",
        message: /vector must be a non-empty array of finite numbers/,
    });
    assert.throws(() => validateVector(undefined), {
        name: "TypeError",
        message: /vector must be a non-empty array of finite numbers/,
    });
    assert.throws(() => validateVector("not-an-array"), {
        name: "TypeError",
        message: /vector must be a non-empty array of finite numbers/,
    });
    assert.throws(() => validateVector({}), {
        name: "TypeError",
        message: /vector must be a non-empty array of finite numbers/,
    });

    // Empty array
    assert.throws(() => validateVector([]), {
        name: "TypeError",
        message: /vector must be a non-empty array of finite numbers/,
    });

    // Non-finite elements
    assert.throws(() => validateVector([0.1, NaN, 0.5]), {
        name: "TypeError",
        message: /vector components must be finite numbers/,
    });
    assert.throws(() => validateVector([0.1, Infinity]), {
        name: "TypeError",
        message: /vector components must be finite numbers/,
    });
    assert.throws(() => validateVector([-Infinity, 0.2]), {
        name: "TypeError",
        message: /vector components must be finite numbers/,
    });

    // Non-number elements
    assert.throws(() => validateVector([0.1, "0.2"]), {
        name: "TypeError",
        message: /vector components must be finite numbers/,
    });
    assert.throws(() => validateVector([0.1, null]), {
        name: "TypeError",
        message: /vector components must be finite numbers/,
    });

    // Valid vector passes without throwing
    assert.doesNotThrow(() => validateVector([0.1, -0.5, 0, 1.23]));
});

test("MemWal.rememberManual() rejects invalid input before signing (#1211)", async () => {
    const memwal = client();
    let requests = 0;
    memwal.signedRequest = async () => {
        requests += 1;
        return { id: "1", blob_id: "blob1", owner: "0x1", namespace: "default" };
    };

    // Missing options
    await assert.rejects(() => memwal.rememberManual(), {
        name: "TypeError",
        message: /rememberManual: options must be an object/,
    });
    await assert.rejects(() => memwal.rememberManual(null), {
        name: "TypeError",
        message: /rememberManual: options must be an object/,
    });

    // Missing or invalid encryptedData
    await assert.rejects(() => memwal.rememberManual({}), {
        name: "TypeError",
        message: /encryptedData must be a non-empty string/,
    });
    await assert.rejects(() => memwal.rememberManual({ encryptedData: "" }), {
        name: "TypeError",
        message: /encryptedData must be a non-empty string/,
    });
    await assert.rejects(() => memwal.rememberManual({ encryptedData: "   " }), {
        name: "TypeError",
        message: /encryptedData must be a non-empty string/,
    });
    await assert.rejects(() => memwal.rememberManual({ encryptedData: 123 }), {
        name: "TypeError",
        message: /encryptedData must be a non-empty string/,
    });

    // Missing or invalid vector
    await assert.rejects(
        () => memwal.rememberManual({ encryptedData: "aGVsbG8=" }),
        {
            name: "TypeError",
            message: /vector must be a non-empty array of finite numbers/,
        },
    );
    await assert.rejects(
        () => memwal.rememberManual({ encryptedData: "aGVsbG8=", vector: [] }),
        {
            name: "TypeError",
            message: /vector must be a non-empty array of finite numbers/,
        },
    );
    await assert.rejects(
        () => memwal.rememberManual({ encryptedData: "aGVsbG8=", vector: "not-a-vector" }),
        {
            name: "TypeError",
            message: /vector must be a non-empty array of finite numbers/,
        },
    );
    await assert.rejects(
        () => memwal.rememberManual({ encryptedData: "aGVsbG8=", vector: [0.1, NaN] }),
        {
            name: "TypeError",
            message: /vector components must be finite numbers/,
        },
    );
    await assert.rejects(
        () => memwal.rememberManual({ encryptedData: "aGVsbG8=", vector: [Infinity, 0.5] }),
        {
            name: "TypeError",
            message: /vector components must be finite numbers/,
        },
    );
    await assert.rejects(
        () => memwal.rememberManual({ encryptedData: "aGVsbG8=", vector: [-Infinity] }),
        {
            name: "TypeError",
            message: /vector components must be finite numbers/,
        },
    );

    // Empty namespace
    await assert.rejects(
        () =>
            memwal.rememberManual({
                encryptedData: "aGVsbG8=",
                vector: [0.1, 0.2],
                namespace: "",
            }),
        {
            name: "Error",
            message: /namespace cannot be empty/,
        },
    );

    assert.equal(requests, 0);

    // Valid call succeeds
    const result = await memwal.rememberManual({
        encryptedData: "aGVsbG8=",
        vector: [0.1, 0.2],
    });
    assert.equal(result.id, "1");
    assert.equal(requests, 1);
});

test("MemWal.recallManual() rejects invalid input before signing (#1211)", async () => {
    const memwal = client();
    let requests = 0;
    memwal.signedRequest = async () => {
        requests += 1;
        return { results: [], total: 0 };
    };

    // Missing options
    await assert.rejects(() => memwal.recallManual(), {
        name: "TypeError",
        message: /recallManual: options must be an object/,
    });
    await assert.rejects(() => memwal.recallManual(null), {
        name: "TypeError",
        message: /recallManual: options must be an object/,
    });

    // Missing or invalid vector
    await assert.rejects(() => memwal.recallManual({}), {
        name: "TypeError",
        message: /vector must be a non-empty array of finite numbers/,
    });
    await assert.rejects(() => memwal.recallManual({ vector: [] }), {
        name: "TypeError",
        message: /vector must be a non-empty array of finite numbers/,
    });
    await assert.rejects(() => memwal.recallManual({ vector: "not-a-vector" }), {
        name: "TypeError",
        message: /vector must be a non-empty array of finite numbers/,
    });
    await assert.rejects(
        () => memwal.recallManual({ vector: [0.1, NaN, Infinity, -Infinity, 0.5] }),
        {
            name: "TypeError",
            message: /vector components must be finite numbers/,
        },
    );

    // Invalid limit
    const badLimits = [0, -1, -5, 2.5, NaN, "10", null];
    for (const bad of badLimits) {
        await assert.rejects(
            () => memwal.recallManual({ vector: [0.1, 0.2], limit: bad }),
            {
                name: "TypeError",
                message: /limit must be a positive integer/,
            },
        );
    }

    // Invalid scoringWeights
    await assert.rejects(
        () =>
            memwal.recallManual({
                vector: [0.1, 0.2],
                scoringWeights: { semantic: NaN },
            }),
        {
            name: "Error",
            message: /scoringWeights\.semantic must be a finite number/,
        },
    );
    await assert.rejects(
        () =>
            memwal.recallManual({
                vector: [0.1, 0.2],
                scoringWeights: { recency: Infinity },
            }),
        {
            name: "Error",
            message: /scoringWeights\.recency must be a finite number/,
        },
    );

    // Empty namespace
    await assert.rejects(
        () =>
            memwal.recallManual({
                vector: [0.1, 0.2],
                namespace: "",
            }),
        {
            name: "Error",
            message: /namespace cannot be empty/,
        },
    );

    assert.equal(requests, 0);

    // Valid call succeeds
    const result = await memwal.recallManual({
        vector: [0.1, 0.2],
    });
    assert.deepEqual(result.results, []);
    assert.equal(requests, 1);
});
