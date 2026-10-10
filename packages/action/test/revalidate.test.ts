import { describe, expect, it, vi } from "vitest";
import { revalidate } from "../src/revalidate.ts";

const url = new URL("https://example.com/api/revalidate");

describe("revalidate", () => {
  it("posts with a bearer token", async () => {
    const fetchImpl = vi.fn(async () => new Response("ok", { status: 200 }));
    const result = await revalidate(url, "secret", fetchImpl);
    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      url,
      expect.objectContaining({ method: "POST", headers: { Authorization: "Bearer secret" } }),
    );
  });

  it("explains an auth failure", async () => {
    const result = await revalidate(url, "wrong", async () => new Response("", { status: 401 }));
    expect(result).toEqual({
      ok: false,
      message: expect.stringContaining("check revalidate-secret"),
    });
  });

  it("reports network errors instead of throwing", async () => {
    const result = await revalidate(url, undefined, async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(result).toEqual({ ok: false, message: expect.stringContaining("ECONNREFUSED") });
  });
});
