/**
 * Tests for MemWal.whoami() — validates the delegate key and resolves
 * the on-chain identity via GET /api/whoami.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { MemWal } from "../dist/memwal.js";

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

function versionBody() {
    return Response.json({
        apiVersion: "1.0.0",
        relayerVersion: "1.0.0",
        minSupportedSdk: { typescript: "0.0.4" },
    });
}

const FAKE_WHOAMI = {
    account_id: "0xabc",
    owner: "0xdef",
    package_id: "0x123",
};

test("whoami() maps snake_case server response to camelCase WhoamiResult", async () => {
    globalThis.fetch = async (url) => {
        const path = new URL(url).pathname;
        if (path === "/version") return versionBody();
        if (path === "/api/config" || path === "/config")
            return Response.json({ packageId: "0x1", network: "testnet" });
        if (path === "/api/whoami")
            return Response.json(FAKE_WHOAMI);
        throw new Error(`unexpected ${path}`);
    };
    const result = await client().whoami();
    assert.equal(result.accountId, FAKE_WHOAMI.account_id);
    assert.equal(result.owner, FAKE_WHOAMI.owner);
    assert.equal(result.packageId, FAKE_WHOAMI.package_id);
});

test("whoami() throws on a non-200 status", async () => {
    globalThis.fetch = async (url) => {
        const path = new URL(url).pathname;
        if (path === "/version") return versionBody();
        if (path === "/api/whoami")
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "content-type": "application/json" },
            });
        throw new Error(`unexpected ${path}`);
    };
    await assert.rejects(
        () => client().whoami(),
        (err) => err instanceof Error,
    );
});

test("whoami() throws on an empty body 200", async () => {
    globalThis.fetch = async (url) => {
        const path = new URL(url).pathname;
        if (path === "/version") return versionBody();
        if (path === "/api/whoami")
            return new Response("", { status: 200 });
        throw new Error(`unexpected ${path}`);
    };
    await assert.rejects(
        () => client().whoami(),
        (err) => err instanceof Error && !(err instanceof SyntaxError),
    );
});

test("WhoamiResult is exported from the package root", async () => {
    // Type-level check: importing WhoamiResult must not throw at runtime.
    // We can only check that the export exists; TypeScript guarantees the shape.
    const mod = await import("../dist/index.js");
    // WhoamiResult is a type-only export; its presence is verified at compile
    // time. Here we check that the module at least loads without error and that
    // whoami is a method on MemWal instances.
    assert.equal(typeof mod.MemWal, "function");
    const instance = mod.MemWal.create({
        key: "22".repeat(32),
        accountId: "0x2",
        serverUrl: "https://relayer.example",
    });
    assert.equal(typeof instance.whoami, "function");
});
