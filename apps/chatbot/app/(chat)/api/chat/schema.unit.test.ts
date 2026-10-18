import { describe, expect, it } from "vitest";
import { postRequestBodySchema } from "./schema";

const VALID_CHAT_ID = "11111111-1111-1111-1111-111111111111";
const VALID_MESSAGE_ID = "22222222-2222-2222-2222-222222222222";

describe("postRequestBodySchema", () => {
  it("accepts valid request with single message (normal user turn)", () => {
    const payload = {
      id: VALID_CHAT_ID,
      message: {
        id: VALID_MESSAGE_ID,
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      },
      selectedChatModel: "gpt-4o",
      selectedVisibilityType: "private",
    };

    const result = postRequestBodySchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("accepts valid request with messages array (tool approval continuation)", () => {
    const payload = {
      id: VALID_CHAT_ID,
      messages: [
        {
          id: VALID_MESSAGE_ID,
          role: "assistant",
          parts: [
            {
              type: "tool-invocation",
              state: "approval-responded",
              approval: { approved: true },
            },
          ],
        },
      ],
      selectedChatModel: "gpt-4o",
      selectedVisibilityType: "private",
    };

    const result = postRequestBodySchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("rejects request when neither message nor messages is provided", () => {
    const payload = {
      id: VALID_CHAT_ID,
      selectedChatModel: "gpt-4o",
      selectedVisibilityType: "private",
    };

    const result = postRequestBodySchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(
        /Exactly one of 'message' or 'messages' must be provided/
      );
    }
  });

  it("rejects request when both message and messages are provided", () => {
    const payload = {
      id: VALID_CHAT_ID,
      message: {
        id: VALID_MESSAGE_ID,
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      },
      messages: [
        {
          id: VALID_MESSAGE_ID,
          role: "user",
          parts: [{ type: "text", text: "Hello" }],
        },
      ],
      selectedChatModel: "gpt-4o",
      selectedVisibilityType: "private",
    };

    const result = postRequestBodySchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(
        /Exactly one of 'message' or 'messages' must be provided/
      );
    }
  });

  it("rejects request with invalid chat UUID", () => {
    const payload = {
      id: "not-a-uuid",
      message: {
        id: VALID_MESSAGE_ID,
        role: "user",
        parts: [{ type: "text", text: "Hello" }],
      },
      selectedChatModel: "gpt-4o",
      selectedVisibilityType: "private",
    };

    const result = postRequestBodySchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});
