import { describe, expect, it } from "vitest";
import { ApiError, messageForError } from "@/lib/api/errors";

describe("ApiError", () => {
  it("wraps a parsed error body", () => {
    const error = new ApiError({
      statusCode: 422,
      code: "VALIDATION_FAILED",
      message: "Slug is taken",
      details: { slug: "duplicate" },
      requestId: "req-1",
      path: "/admin/categories",
      timestamp: "2026-01-01T00:00:00Z",
    });
    expect(error.status).toBe(422);
    expect(error.code).toBe("VALIDATION_FAILED");
    expect(error.message).toBe("Slug is taken");
    expect(error.details).toEqual({ slug: "duplicate" });
    expect(error.requestId).toBe("req-1");
    expect(error.path).toBe("/admin/categories");
    expect(error).toBeInstanceOf(Error);
  });

  it("fromStatus keeps a parsed body when present", () => {
    const error = ApiError.fromStatus(400, {
      statusCode: 400,
      code: "BAD_REQUEST",
      message: "nope",
      path: "/x",
      timestamp: "2026-01-01T00:00:00Z",
    });
    expect(error.code).toBe("BAD_REQUEST");
    expect(error.message).toBe("nope");
  });

  it("fromStatus synthesises a fallback body otherwise", () => {
    const error = ApiError.fromStatus(503, undefined);
    expect(error.status).toBe(503);
    expect(error.code).toBe("HTTP_503");
    expect(error.message).toContain("503");
  });

  it("network and timeout errors report client-side failures", () => {
    const network = ApiError.network();
    expect(network.isNetworkFailure).toBe(true);
    const timeout = ApiError.timeout();
    expect(timeout.isNetworkFailure).toBe(true);
    const serverError = ApiError.fromStatus(500, undefined);
    expect(serverError.isNetworkFailure).toBe(false);
  });
});

describe("messageForError", () => {
  it("prefers a friendly message", () => {
    expect(messageForError(new ApiError(ApiErrorBody(400)))).toBe("Bad value");
    expect(messageForError(new Error("boom"))).toBe("boom");
    expect(messageForError("anything")).toBe("Unexpected error. Please try again.");
  });
});

function ApiErrorBody(statusCode: number): ConstructorParameters<typeof ApiError>[0] {
  return {
    statusCode,
    code: "TEST",
    message: "Bad value",
    path: "/test",
    timestamp: new Date().toISOString(),
  };
}