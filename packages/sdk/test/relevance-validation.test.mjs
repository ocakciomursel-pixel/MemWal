import test from "node:test";
import assert from "node:assert/strict";

import {
    formatUntrustedMemories,
    computeRelevance,
} from "../dist/ai/untrusted-memory.js";

test("computeRelevance validates and clamps distance properly (#976)", () => {
    // Non-finite / missing distance defaults to 0
    assert.equal(computeRelevance(undefined), 0);
    assert.equal(computeRelevance(null), 0);
    assert.equal(computeRelevance(NaN), 0);
    assert.equal(computeRelevance(Infinity), 0);
    assert.equal(computeRelevance(-Infinity), 0);
    assert.equal(computeRelevance("0.5"), 0);

    // Negative distance (poisoned/out of range) clamps to 1.0 (max relevance)
    assert.equal(computeRelevance(-0.5), 1);
    assert.equal(computeRelevance(-10), 1);

    // Distance > 1 clamps to 0.0 (min relevance)
    assert.equal(computeRelevance(2.5), 0);
    assert.equal(computeRelevance(1.5), 0);

    // Normal valid distances
    assert.equal(computeRelevance(0), 1);
    assert.equal(computeRelevance(1), 0);
    assert.equal(computeRelevance(0.2), 0.8);
});

test("formatUntrustedMemories handles undefined, NaN, and out-of-range distance safely (#976)", () => {
    const memories = [
        { blob_id: "b1", text: "missing distance", distance: undefined },
        { blob_id: "b2", text: "nan distance", distance: NaN },
        { blob_id: "b3", text: "negative distance", distance: -0.5 },
        { blob_id: "b4", text: "excessive distance", distance: 2.5 },
        { blob_id: "b5", text: "normal distance", distance: 0.15 },
    ];

    const formatted = formatUntrustedMemories(memories);

    assert.doesNotMatch(formatted, /"relevance":"NaN"/);
    assert.doesNotMatch(formatted, /"relevance":"1\.50"/);
    assert.doesNotMatch(formatted, /"relevance":"-1\.50"/);

    assert.match(formatted, /"text":"missing distance","relevance":"0\.00"/);
    assert.match(formatted, /"text":"nan distance","relevance":"0\.00"/);
    assert.match(formatted, /"text":"negative distance","relevance":"1\.00"/);
    assert.match(formatted, /"text":"excessive distance","relevance":"0\.00"/);
    assert.match(formatted, /"text":"normal distance","relevance":"0\.85"/);
});
