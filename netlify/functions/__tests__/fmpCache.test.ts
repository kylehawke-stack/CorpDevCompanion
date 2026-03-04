import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cachedFmpFetch } from "../lib/fmpCache.js";

// Stub Supabase env vars so getSupabase() returns null (solo mode)
beforeEach(() => {
  delete process.env.SUPABASE_URL;
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_KEY;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cachedFmpFetch", () => {
  it("returns parsed JSON on a normal response", async () => {
    const payload = [{ symbol: "HBB", companyName: "Hamilton Beach" }];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(payload),
      })
    );

    const result = await cachedFmpFetch("profile", { symbol: "HBB" }, "test-key");
    expect(result).toEqual(payload);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("returns null on HTTP 500 (does not throw)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 })
    );

    const result = await cachedFmpFetch("profile", { symbol: "BAD" }, "test-key");
    expect(result).toBeNull();
  });

  it("returns null on network error (does not throw)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("fetch failed"))
    );

    const result = await cachedFmpFetch("profile", { symbol: "BAD" }, "test-key");
    expect(result).toBeNull();
  });

  it("returns null when fetch exceeds timeout", async () => {
    // Simulate a fetch that never resolves within the timeout
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        (_url: string, opts: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            opts.signal.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          })
      )
    );

    const result = await cachedFmpFetch("profile", { symbol: "SLOW" }, "test-key", 50);
    expect(result).toBeNull();
  });

  it("passes AbortController signal to fetch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: true }),
      })
    );

    await cachedFmpFetch("profile", { symbol: "HBB" }, "test-key", 5000);

    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[1]).toHaveProperty("signal");
    expect(call[1].signal).toBeInstanceOf(AbortSignal);
  });

  it("builds correct FMP URL with params", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );

    await cachedFmpFetch("income-statement", { symbol: "HBB", period: "annual", limit: "4" }, "my-key");

    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("https://financialmodelingprep.com/stable/income-statement?");
    expect(url).toContain("symbol=HBB");
    expect(url).toContain("period=annual");
    expect(url).toContain("limit=4");
    expect(url).toContain("apikey=my-key");
  });
});
