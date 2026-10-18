import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const CHAT_VAL = "66666666-6666-6666-6666-666666666666";
const MESSAGE_VAL = "77777777-7777-7777-7777-777777777777";

let capturedWhere: unknown;
let capturedSet: unknown;

const where = vi.fn((clause: unknown) => {
  capturedWhere = clause;
  return Promise.resolve([]);
});
const set = vi.fn((values: unknown) => {
  capturedSet = values;
  return { where };
});
const update = vi.fn(() => ({ set }));

vi.mock("server-only", () => ({}));
vi.mock("postgres", () => ({ default: () => ({}) }));
vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: () => ({
    update,
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn() })) })),
    insert: vi.fn(() => ({ values: vi.fn(() => Promise.resolve([])) })),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  capturedWhere = undefined;
  capturedSet = undefined;
});

describe("updateMessage DB-layer scoping", () => {
  it("scopes the message update to both id and chatId to prevent cross-chat overwrite", async () => {
    const { updateMessage } = await import("./queries");

    const sampleParts = [{ type: "text", text: "updated message" }];

    await updateMessage({
      id: MESSAGE_VAL,
      chatId: CHAT_VAL,
      parts: sampleParts as never,
    });

    expect(update).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith({ parts: sampleParts });
    expect(where).toHaveBeenCalledTimes(1);
    expect(capturedWhere).toBeDefined();

    const { sql, params } = new PgDialect().sqlToQuery(capturedWhere as never);

    expect(sql).toMatch(/"id"/);
    expect(sql).toMatch(/"chatId"/);
    expect(params).toContain(MESSAGE_VAL);
    expect(params).toContain(CHAT_VAL);
  });
});
