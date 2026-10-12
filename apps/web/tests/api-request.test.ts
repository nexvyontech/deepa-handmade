import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/lib/api/request";
import { readTokenPair, writeTokenPair, clearTokens } from "@/lib/api/tokens";
import { ApiError } from "@/lib/api/errors";

const API_BASE = "http://api.test";
const ACCESS_KEY = "deepa.accessToken";

function unauthBody() {
  return {
    statusCode: 401,
    code: "UNAUTHORIZED",
    message: "Session expired",
    path: "/auth/me",
    timestamp: new Date().toISOString(),
  };
}

function okJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api request layer", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = API_BASE;
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
        const url = String(input);
        const auth =
          init?.headers instanceof Headers ? init.headers.get("Authorization") : null;

        if (url.endsWith("/auth/refresh")) {
          return okJson({ accessToken: "fresh-token", refreshToken: "fresh-refresh" });
        }
        if (url.endsWith("/auth/me")) {
          if (auth === "Bearer fresh-token") {
            return okJson({ id: "u1", role: "ADMIN", permissions: ["product.read"] });
          }
          return okJson(unauthBody(), 401);
        }
        if (url.endsWith("/public/items")) {
          return okJson({ items: [], auth: auth ?? null });
        }
        if (url.endsWith("/validate")) {
          return okJson(
            {
              statusCode: 422,
              code: "VALIDATION_FAILED",
              message: "Slug is taken",
              path: "/validate",
              timestamp: new Date().toISOString(),
            },
            422,
          );
        }
        return okJson({ ok: true });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearTokens();
  });

  it("attaches the bearer token for auto-auth requests", async () => {
    writeTokenPair({ accessToken: "abc", refreshToken: "r1" });
    const data = await apiRequest<{ auth: string | null }>({ path: "/public/items" });
    expect(data.auth).toBe("Bearer abc");
  });

  it("does not attach a token when auth is 'none' even if one exists", async () => {
    writeTokenPair({ accessToken: "abc", refreshToken: "r1" });
    const data = await apiRequest<{ auth: string | null }>({ path: "/public/items", auth: "none" });
    expect(data.auth).toBeNull();
  });

  it("expands query arrays and skips undefined/null values", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    await apiRequest({ path: "/items", query: { kind: ["a", "b"], page: 2, q: undefined, flag: null } });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toBe(`${API_BASE}/api/v1/items?kind=a&kind=b&page=2`);
  });

  it("throws ApiError with the parsed body for non-401 failures", async () => {
    await expect(apiRequest({ path: "/validate", auth: "none" })).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_FAILED",
      message: "Slug is taken",
    });
  });

  it("auto-refreshes once and retries on 401", async () => {
    writeTokenPair({ accessToken: "expired-token", refreshToken: "r1" });
    const data = await apiRequest<{ id: string }>({ path: "/auth/me" });
    expect(data.id).toBe("u1");
    expect(readTokenPair()?.accessToken).toBe("fresh-token");
  });

  it("runs the refresh single-flight across concurrent 401s", async () => {
    writeTokenPair({ accessToken: "expired-token", refreshToken: "r1" });
    const fetchMock = vi.mocked(globalThis.fetch);
    const results = await Promise.all([
      apiRequest<{ id: string }>({ path: "/auth/me" }),
      apiRequest<{ id: string }>({ path: "/auth/me" }),
    ]);
    expect(results.map((r) => r.id)).toEqual(["u1", "u1"]);
    const refreshCalls = fetchMock.mock.calls.filter((call) => String(call[0]).endsWith("/auth/refresh")).length;
    expect(refreshCalls).toBe(1);
  });

  it("notifies unauthorized when a 401 cannot be refreshed", async () => {
    window.localStorage.setItem(ACCESS_KEY, "expired-token");
    await expect(apiRequest({ path: "/auth/me" })).rejects.toBeInstanceOf(ApiError);
  });
});